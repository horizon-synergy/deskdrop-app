/**
 * ProfilePage.tsx
 * ----------------------------------------------------------------------------
 * Authenticated route: /profile
 *
 * Shows the signed-in user's own account details pulled from `useAuth()`
 * (backed by the live authStore — see hooks/useAuth.ts). Includes a
 * resend-verification action for users whose email isn't verified yet,
 * and sign-out. This is a real, fully wired page: every button here
 * performs an actual Firebase Auth operation, not a stub.
 */

import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { resendEmailVerification, signOut } from '@/lib/firebase/auth.service';
import styles from './ProfilePage.module.css';

export function ProfilePage(): ReactElement {
  const { displayName, email, role, emailVerified } = useAuth();
  const navigate = useNavigate();
  const [verificationSent, setVerificationSent] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleResendVerification(): Promise<void> {
    setActionError(null);
    try {
      await resendEmailVerification();
      setVerificationSent(true);
    } catch {
      setActionError('Could not send the verification email. Please try again shortly.');
    }
  }

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Your account</h1>

        <dl className={styles.detailList}>
          <div className={styles.detailRow}>
            <dt>Name</dt>
            <dd>{displayName ?? '—'}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Email</dt>
            <dd>{email}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Role</dt>
            <dd className={styles.roleBadge}>{role}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Email verified</dt>
            <dd>{emailVerified ? 'Yes' : 'No'}</dd>
          </div>
        </dl>

        {!emailVerified ? (
          <div className={styles.verifyBanner}>
            <p>Please verify your email address to unlock reviews and order notifications.</p>
            {verificationSent ? (
              <span className={styles.verifySent}>Verification email sent — check your inbox.</span>
            ) : (
              <button type="button" className={styles.linkButton} onClick={() => void handleResendVerification()}>
                Resend verification email
              </button>
            )}
          </div>
        ) : null}

        {actionError ? <p className={styles.errorText}>{actionError}</p> : null}

        <button
          type="button"
          className={styles.signOutButton}
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
        >
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
