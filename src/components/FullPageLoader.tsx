/**
 * FullPageLoader.tsx
 * ----------------------------------------------------------------------------
 * Simple full-viewport loading indicator. Used by the route guards while
 * Firebase Auth's session state is being restored, and available for reuse
 * anywhere else a blocking, full-screen loading state is appropriate.
 */

import type { ReactElement } from 'react';
import styles from './FullPageLoader.module.css';

interface FullPageLoaderProps {
  /** Screen-reader + visible label describing what's loading. */
  label: string;
}

export function FullPageLoader({ label }: FullPageLoaderProps): ReactElement {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.label}>{label}</p>
    </div>
  );
}
