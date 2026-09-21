/**
 * AdminRoute.tsx
 * ----------------------------------------------------------------------------
 * Wraps every route under /admin/*. Requires BOTH an authenticated user
 * AND a role in ADMIN_ROLES (staff/manager/admin/superadmin). Anyone else —
 * including a signed-in customer — is redirected immediately (to /, not to
 * /login, since redirecting an already-authenticated non-admin to a login
 * screen would be confusing: they *are* logged in, they're just not
 * authorized for this area).
 *
 * As with ProtectedRoute, this is the UX layer only. The real boundary is
 * firestore.rules, which independently re-checks the acting user's role
 * document on every read/write to admin-only collections. Even if someone
 * bypassed this component entirely (e.g. by editing client bundle state in
 * devtools), every Firestore call they attempt would still be rejected
 * server-side.
 */

import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { FullPageLoader } from '@/components/FullPageLoader';

export function AdminRoute(): ReactElement {
  const { isReady, isAuthenticated } = useAuth();
  const { isAdminAreaUser } = usePermission();

  if (!isReady) {
    return <FullPageLoader label="Verifying access…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  }

  if (!isAdminAreaUser) {
    // Immediate redirect for any non-admin role, as required: a customer
    // (or a staff-less unknown role) never sees the admin shell render.
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
