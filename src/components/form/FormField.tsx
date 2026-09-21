/**
 * FormField.tsx
 * ----------------------------------------------------------------------------
 * A labeled text input with inline validation error text. Shared across
 * every feature that builds a form with React Hook Form (auth, admin
 * catalog management, and beyond) — deliberately framework-thin: it
 * accepts whatever props `useForm().register(...)` spreads onto it, so it
 * composes with React Hook Form without this component needing to know
 * about form state itself. Accessibility: label is programmatically
 * associated via htmlFor/id, and the error message is linked with
 * aria-describedby so screen readers announce it.
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './FormField.module.css';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Validation error message for this field, if any (from formState.errors). */
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, id, ...inputProps },
  ref,
) {
  const fieldId = id ?? inputProps.name;
  const errorId = `${fieldId}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
      </label>
      <input
        {...inputProps}
        ref={ref}
        id={fieldId}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className={styles.errorText} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
