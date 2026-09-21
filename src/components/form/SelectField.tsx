/**
 * SelectField.tsx
 * ----------------------------------------------------------------------------
 * Labeled <select> with the same error/a11y pattern as FormField.tsx.
 * Options are passed as a simple {value, label} array so callers don't
 * need to hand-write <option> JSX for every dropdown (product status,
 * parent category, etc.).
 */

import { forwardRef, type SelectHTMLAttributes } from 'react';
import styles from './FormField.module.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: SelectOption[];
  /** Placeholder shown as a disabled first option when no value is selected yet. */
  placeholder?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, id, options, placeholder, ...selectProps },
  ref,
) {
  const fieldId = id ?? selectProps.name;
  const errorId = `${fieldId}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
      </label>
      <select
        {...selectProps}
        ref={ref}
        id={fieldId}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className={styles.errorText} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
