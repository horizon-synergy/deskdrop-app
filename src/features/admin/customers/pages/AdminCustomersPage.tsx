/**
 * AdminCustomersPage.tsx
 * ----------------------------------------------------------------------------
 * Admin route: /admin/customers (manager+ to VIEW — matching
 * firestore.rules' `users/{uid}` read rule, which grants any admin-area
 * user read access to all profiles).
 *
 * Role changes and account disable/enable are further restricted to
 * admin+ in the UI, matching the *write* side of the same rule
 * (`callerHasMinimumRole('admin')` for editing someone else's role/
 * isDisabled — see firestore.rules). A manager viewing this page sees
 * every customer but the role dropdown and disable toggle are read-only
 * for them; if they were somehow bypassed, the Firestore write would
 * simply be rejected server-side, so this is UX-appropriate graying-out,
 * not the actual security boundary.
 */

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { FullPageLoader } from '@/components/FullPageLoader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/hooks/useAuth';
import { listAllUsers, updateUserRole, setUserDisabled } from '@/lib/firebase/users.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import type { UserDocument, UserRole } from '@/types/user.types';
import styles from './AdminCustomersPage.module.css';

const ROLE_OPTIONS: UserRole[] = ['customer', 'staff', 'manager', 'admin', 'superadmin'];

export function AdminCustomersPage(): ReactElement {
  const { uid: currentUid } = useAuth();
  const { hasMinimumRole } = usePermission();
  const canManageRoles = hasMinimumRole('admin');

  const [users, setUsers] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [pendingDisableToggle, setPendingDisableToggle] = useState<UserDocument | null>(null);

  async function loadUsers(): Promise<void> {
    setIsLoading(true);
    setLoadError(null);
    try {
      const results = await listAllUsers();
      setUsers(results);
    } catch (error) {
      setLoadError(describeFirestoreError(error, 'Could not load customers. Please refresh the page.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (user) => user.email.toLowerCase().includes(term) || user.displayName.toLowerCase().includes(term),
    );
  }, [users, searchTerm]);

  async function handleRoleChange(user: UserDocument, nextRole: UserRole): Promise<void> {
    setActionError(null);
    setSavingUid(user.uid);
    try {
      await updateUserRole(user.uid, nextRole);
      await loadUsers();
    } catch (error) {
      setActionError(describeFirestoreError(error, 'Could not update this role. Please try again.'));
    } finally {
      setSavingUid(null);
    }
  }

  async function confirmDisableToggle(): Promise<void> {
    if (!pendingDisableToggle) return;
    setActionError(null);
    setSavingUid(pendingDisableToggle.uid);
    try {
      await setUserDisabled(pendingDisableToggle.uid, !pendingDisableToggle.isDisabled);
      setPendingDisableToggle(null);
      await loadUsers();
    } catch (error) {
      setActionError(describeFirestoreError(error, 'Could not update this account. Please try again.'));
      setPendingDisableToggle(null);
    } finally {
      setSavingUid(null);
    }
  }

  if (isLoading) {
    return <FullPageLoader label="Loading customers…" />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Customers</h1>
          <p className={styles.subtitle}>
            {canManageRoles
              ? 'View and manage every account, including staff roles.'
              : 'View every account. Role and account changes require an admin.'}
          </p>
        </div>
        <input
          type="search"
          placeholder="Search by name or email…"
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </header>

      {loadError ? <p className={styles.errorText}>{loadError}</p> : null}
      {actionError ? <p className={styles.errorText}>{actionError}</p> : null}

      {filteredUsers.length === 0 && !loadError ? (
        <p className={styles.emptyState}>No customers match this search.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Verified</th>
              <th>Role</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const isSelf = user.uid === currentUid;
              const isSaving = savingUid === user.uid;
              return (
                <tr key={user.uid}>
                  <td>{user.displayName}</td>
                  <td className={styles.mutedCell}>{user.email}</td>
                  <td className={styles.mutedCell}>{user.emailVerified ? 'Yes' : 'No'}</td>
                  <td>
                    {canManageRoles ? (
                      <select
                        className={styles.roleSelect}
                        value={user.role}
                        disabled={isSaving || isSelf}
                        onChange={(e) => void handleRoleChange(user, e.target.value as UserRole)}
                        aria-label={`Role for ${user.displayName}`}
                        title={isSelf ? "You can't change your own role here." : undefined}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={styles.roleBadge}>{user.role}</span>
                    )}
                  </td>
                  <td>
                    <span className={user.isDisabled ? styles.statusDisabled : styles.statusActive}>
                      {user.isDisabled ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td className={styles.actionsCell}>
                    {canManageRoles && !isSelf ? (
                      <button
                        type="button"
                        className={user.isDisabled ? styles.enableButton : styles.disableButton}
                        onClick={() => setPendingDisableToggle(user)}
                        disabled={isSaving}
                      >
                        {user.isDisabled ? 'Enable' : 'Disable'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        isOpen={pendingDisableToggle !== null}
        title={pendingDisableToggle?.isDisabled ? 'Enable account' : 'Disable account'}
        message={
          pendingDisableToggle?.isDisabled
            ? `Re-enable ${pendingDisableToggle?.displayName}'s account? They'll be able to sign in again.`
            : `Disable ${pendingDisableToggle?.displayName}'s account? They won't be able to sign in until re-enabled.`
        }
        confirmLabel={pendingDisableToggle?.isDisabled ? 'Enable' : 'Disable'}
        tone={pendingDisableToggle?.isDisabled ? 'default' : 'danger'}
        onConfirm={() => void confirmDisableToggle()}
        onCancel={() => setPendingDisableToggle(null)}
      />
    </div>
  );
}
