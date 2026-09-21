/**
 * usePermission.ts
 * ----------------------------------------------------------------------------
 * Centralizes "is the current user allowed to do X" checks so that
 * permission logic isn't reimplemented (and potentially gotten subtly
 * wrong) in every component. Used by route guards and by in-page UI
 * (e.g. hiding a "Delete Product" button from a `staff` user who
 * technically has admin-area access but not that specific permission).
 *
 * Reminder: this hook governs what the UI *shows*. It is not a security
 * boundary — see firestore.rules for the actual enforcement.
 */

import { useAuth } from './useAuth';
import { ROLE_HIERARCHY, ADMIN_ROLES, type UserRole } from '@/types/user.types';

export interface UsePermissionResult {
  role: UserRole;
  /** True if the current role is anywhere in ADMIN_ROLES (staff and above) —
   *  i.e. allowed into the /admin route tree at all. */
  isAdminAreaUser: boolean;
  /** Returns true if the current user's role is >= the given role in
   *  privilege (see ROLE_HIERARCHY). Example: hasMinimumRole('manager')
   *  is true for manager, admin, and superadmin, false for staff/customer. */
  hasMinimumRole: (minimumRole: UserRole) => boolean;
  /** Returns true only if the current role is exactly one of the given roles. */
  hasExactRole: (...roles: UserRole[]) => boolean;
}

export function usePermission(): UsePermissionResult {
  const { role } = useAuth();

  const hasMinimumRole = (minimumRole: UserRole): boolean => {
    const currentIndex = ROLE_HIERARCHY.indexOf(role);
    const requiredIndex = ROLE_HIERARCHY.indexOf(minimumRole);
    return currentIndex >= requiredIndex;
  };

  const hasExactRole = (...roles: UserRole[]): boolean => roles.includes(role);

  return {
    role,
    isAdminAreaUser: (ADMIN_ROLES as UserRole[]).includes(role),
    hasMinimumRole,
    hasExactRole,
  };
}
