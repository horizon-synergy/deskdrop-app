import type { ReactElement } from 'react';
import styles from './OrDivider.module.css';

/** Simple "or" divider separating OAuth buttons from the email/password form. */
export function OrDivider(): ReactElement {
  return (
    <div className={styles.divider} role="separator">
      <span className={styles.line} />
      <span className={styles.label}>or</span>
      <span className={styles.line} />
    </div>
  );
}
