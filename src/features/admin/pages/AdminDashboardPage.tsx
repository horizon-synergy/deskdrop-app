/**
 * AdminDashboardPage.tsx
 * ----------------------------------------------------------------------------
 * Admin route: /admin (guarded by AdminRoute — see router/AdminRoute.tsx)
 *
 * Landing screen for the admin area. Reads the signed-in user's *actual*
 * profile (uid, email, role) from useAuth() — nothing here is mock data.
 * Products and Categories link to real, fully-built modules (manager+,
 * enforced both by <RequireRole> in AppRouter.tsx and by firestore.rules
 * server-side). The remaining modules (Inventory, Orders, Customers,
 * Promotions, Reports, Analytics, Settings) are the next build passes on
 * top of this foundation; they're listed as plain informational text
 * rather than linked to fake pages, so nothing here misrepresents
 * functionality as built when it isn't.
 */

import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import type { UserRole } from '@/types/user.types';
import styles from './AdminDashboardPage.module.css';

interface AdminModule {
  name: string;
  minimumRole: UserRole;
  path: string | null; // null = not yet built
}

const MODULES: AdminModule[] = [
  { name: 'Products', minimumRole: 'manager', path: '/admin/products' },
  { name: 'Categories', minimumRole: 'manager', path: '/admin/categories' },
  { name: 'Inventory', minimumRole: 'staff', path: '/admin/inventory' },
  { name: 'Orders', minimumRole: 'staff', path: '/admin/orders' },
  { name: 'Customers', minimumRole: 'manager', path: '/admin/customers' },
  { name: 'Promotions', minimumRole: 'manager', path: '/admin/promotions' },
  { name: 'Reports', minimumRole: 'admin', path: '/admin/reports' },
  { name: 'Analytics', minimumRole: 'admin', path: '/admin/analytics' },
  { name: 'Settings', minimumRole: 'admin', path: '/admin/settings' },
];

export function AdminDashboardPage(): ReactElement {
  const { displayName, email, role } = useAuth();
  const { hasMinimumRole } = usePermission();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin dashboard</h1>
        <p className={styles.subtitle}>
          Signed in as <strong>{displayName ?? email}</strong> · role:{' '}
          <span className={styles.roleBadge}>{role}</span>
        </p>
      </header>

      <section className={styles.moduleGrid}>
        {MODULES.map((module) => {
          const isAccessible = hasMinimumRole(module.minimumRole);
          const isBuilt = module.path !== null;

          const card = (
            <div className={styles.moduleCard} aria-disabled={!isAccessible}>
              <h2 className={styles.moduleName}>{module.name}</h2>
              <p className={styles.moduleStatus}>
                {!isAccessible
                  ? `Requires ${module.minimumRole} or higher.`
                  : isBuilt
                    ? 'Open module →'
                    : 'Coming in a future build pass.'}
              </p>
            </div>
          );

          return isBuilt && isAccessible ? (
            <Link key={module.name} to={module.path as string} className={styles.moduleLink}>
              {card}
            </Link>
          ) : (
            <div key={module.name}>{card}</div>
          );
        })}
      </section>
    </div>
  );
}
