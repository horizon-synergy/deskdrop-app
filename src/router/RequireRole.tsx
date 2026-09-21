/**
 * RequireRole.tsx
 * ----------------------------------------------------------------------------
 * A more granular sibling to AdminRoute: AdminRoute only checks "is this
 * user in the admin area at all" (staff+). Several admin modules —
 * catalog management (Products/Categories), Reports, Analytics, Settings —
 * need a HIGHER minimum role than plain staff (see firestore.rules, which
 * enforces the exact same minimums server-side). Rather than hard-coding
 * a one-off check into every such page, this component takes the
 * required role as a prop and nests inside <AdminRoute> in AppRouter.tsx,
 * so a route can declare its exact minimum role in one place.
 *
 * Because this is always rendered as a child of AdminRoute, we can assume
 * the user is already authenticated and at least a staff member by the
 * time this component runs — it only needs to check the *additional*
 * privilege bar.
 */

import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import type { UserRole } from '@/types/user.types';

interface RequireRoleProps {
  minimumRole: UserRole;
}

export function RequireRole({ minimumRole }: RequireRoleProps): ReactElement {
  const { hasMinimumRole } = usePermission();

  if (!hasMinimumRole(minimumRole)) {
    // Sent back to the admin dashboard landing page rather than out of
    // the admin area entirely — the user IS an admin-area user, they
    // just lack privilege for this specific module.
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
