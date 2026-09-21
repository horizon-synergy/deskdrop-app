/**
 * SubmitButton.tsx
 * ----------------------------------------------------------------------------
 * Primary call-to-action button for auth forms. Shows a busy state and
 * disables itself while `isSubmitting` is true, which prevents duplicate
 * form submissions (e.g. a double-click firing two registration requests).
 */

import type { ReactElement } from 'react';
import styles from './SubmitButton.module.css';

interface SubmitButtonProps {
  children: string;
  isSubmitting: boolean;
  busyLabel: string;
}

export function SubmitButton({ children, isSubmitting, busyLabel }: SubmitButtonProps): ReactElement {
  return (
    <button type="submit" className={styles.button} disabled={isSubmitting}>
      {isSubmitting ? busyLabel : children}
    </button>
  );
}
