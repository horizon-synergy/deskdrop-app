/**
 * FormBanner.tsx
 * ----------------------------------------------------------------------------
 * Displays a single form-level message: either a server/auth error (e.g.
 * "Incorrect email or password") or a success notice (e.g. "Check your
 * inbox to verify your email"). Kept separate from FormField's per-field
 * errors because these messages aren't tied to a single input.
 */

import type { ReactElement } from 'react';
import styles from './FormBanner.module.css';

interface FormBannerProps {
  tone: 'error' | 'success';
  message: string;
}

export function FormBanner({ tone, message }: FormBannerProps): ReactElement {
  return (
    <div
      className={tone === 'error' ? styles.error : styles.success}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {message}
    </div>
  );
}
