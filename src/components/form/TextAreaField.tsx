/**
 * TextAreaField.tsx
 * ----------------------------------------------------------------------------
 * Multi-line counterpart to FormField.tsx — same labeling/error/a11y
 * pattern, used for longer free-text fields like product and category
 * descriptions.
 */

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import styles from './FormField.module.css';

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, error, id, ...textareaProps }, ref) {
    const fieldId = id ?? textareaProps.name;
    const errorId = `${fieldId}-error`;

    return (
      <div className={styles.field}>
        <label htmlFor={fieldId} className={styles.label}>
          {label}
        </label>
        <textarea
          {...textareaProps}
          ref={ref}
          id={fieldId}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          rows={textareaProps.rows ?? 4}
        />
        {error ? (
          <p id={errorId} className={styles.errorText} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
