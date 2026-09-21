/**
 * AdminLayout.tsx
 * ----------------------------------------------------------------------------
 * Persistent chrome for the entire /admin/* route tree — this is the fix
 * for the navigation gap this app shipped with: every admin page used to
 * render as an isolated full-screen route with nothing linking them
 * together, so the only way in was typing a URL and the only way back
 * was the browser's back button. This component wraps every admin route
 * (see AppRouter.tsx, where it sits directly inside <AdminRoute>) with a
 * sidebar that:
 *   - links to every module the SIGNED-IN user's role can actually reach
 *     (reuses usePermission's hasMinimumRole, so a manager simply never
 *     sees Reports/Analytics/Settings links rather than seeing them and
 *     hitting a redirect),
 *   - highlights the current page via NavLink's built-in active state,
 *   - has an explicit "Back to store" link and a "Sign out" action, so
 *     leaving the admin area is never dependent on the browser's history.
 *
 * Renders <Outlet /> for whichever admin page matched, exactly like the
 * route guards do — this is a layout route, not a guard; access control
 * already happened in <AdminRoute>/<RequireRole> before this renders.
 */

import type { ReactElement } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Squares2X2Icon,
  CubeIcon,
  TagIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  TicketIcon,
  ChartBarIcon,
  PresentationChartLineIcon,
  Cog6ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { signOut } from '@/lib/firebase/auth.service';
import type { UserRole } from '@/types/user.types';
import styles from './AdminLayout.module.css';

interface AdminNavItem {
  label: string;
  path: string;
  minimumRole: UserRole;
  icon: typeof Squares2X2Icon;
  /** Exact match only for the dashboard — otherwise e.g. /admin/products
   *  would never get the active style since NavLink's default matching
   *  for "/admin" would also match every nested admin path. */
  end?: boolean;
}

const NAV_ITEMS: AdminNavItem[] = [
  { label: 'Dashboard', path: '/admin', minimumRole: 'staff', icon: Squares2X2Icon, end: true },
  { label: 'Products', path: '/admin/products', minimumRole: 'manager', icon: CubeIcon },
  { label: 'Categories', path: '/admin/categories', minimumRole: 'manager', icon: TagIcon },
  { label: 'Inventory', path: '/admin/inventory', minimumRole: 'staff', icon: ArchiveBoxIcon },
  { label: 'Orders', path: '/admin/orders', minimumRole: 'staff', icon: ClipboardDocumentListIcon },
  { label: 'Customers', path: '/admin/customers', minimumRole: 'manager', icon: UsersIcon },
  { label: 'Promotions', path: '/admin/promotions', minimumRole: 'manager', icon: TicketIcon },
  { label: 'Reports', path: '/admin/reports', minimumRole: 'admin', icon: ChartBarIcon },
  { label: 'Analytics', path: '/admin/analytics', minimumRole: 'admin', icon: PresentationChartLineIcon },
  { label: 'Settings', path: '/admin/settings', minimumRole: 'admin', icon: Cog6ToothIcon },
];

export function AdminLayout(): ReactElement {
  const navigate = useNavigate();
  const { displayName, email, role } = useAuth();
  const { hasMinimumRole } = usePermission();

  async function handleSignOut(): Promise<void> {
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>DeskDrop Admin</div>

        <nav className={styles.nav}>
          {NAV_ITEMS.filter((item) => hasMinimumRole(item.minimumRole)).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
              >
                <Icon width={17} height={17} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <NavLink to="/" className={styles.exitLink}>
            <ArrowLeftIcon width={15} height={15} />
            Back to store
          </NavLink>

          <div className={styles.userBlock}>
            <p className={styles.userName}>{displayName ?? email}</p>
            <p className={styles.userRole}>{role}</p>
          </div>

          <button type="button" className={styles.signOutButton} onClick={() => void handleSignOut()}>
            <ArrowLeftStartOnRectangleIcon width={15} height={15} />
            Sign out
          </button>
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
