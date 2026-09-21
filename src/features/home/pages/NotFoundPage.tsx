/**
 * NotFoundPage.tsx
 * ----------------------------------------------------------------------------
 * Catch-all route (`path="*"` in AppRouter.tsx) for any URL that doesn't
 * match a defined route. A real, minimal page rather than a blank screen —
 * every route in a production app needs a defined 404 behavior.
 */

import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export function NotFoundPage(): ReactElement {
  return (
    <div className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.body}>The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/" className={styles.link}>
        Back to DeskDrop
      </Link>
    </div>
  );
}
