/**
 * ForgotPasswordPage.tsx
 * ----------------------------------------------------------------------------
 * Public route: /forgot-password
 *
 * Sends a Firebase password-reset email. Always shows the same success
 * message regardless of whether the email is actually registered (see
 * auth.service.ts -> requestPasswordReset for why this matters for
 * security — it prevents account enumeration).
 */

import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '@/components/form/FormField';
import { SubmitButton } from '@/components/form/SubmitButton';
import { FormBanner } from '@/components/form/FormBanner';
import { requestPasswordReset, AuthServiceError } from '@/lib/firebase/auth.service';
import styles from './AuthForm.module.css';

interface ForgotPasswordFormValues {
  email: string;
}

export function ForgotPasswordPage(): ReactElement {
  const [formError, setFormError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ mode: 'onBlur' });

  async function onSubmit(values: ForgotPasswordFormValues): Promise<void> {
    setFormError(null);
    try {
      await requestPasswordReset(values.email);
      setIsSent(true);
    } catch (error) {
      setFormError(error instanceof AuthServiceError ? error.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to reset your password."
    >
      {formError ? <FormBanner tone="error" message={formError} /> : null}
      {isSent ? (
        <FormBanner
          tone="success"
          message="If an account exists for that email, a reset link is on its way. Check your inbox."
        />
      ) : null}

      {!isSent ? (
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required.',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' },
            })}
          />
          <SubmitButton isSubmitting={isSubmitting} busyLabel="Sending…">
            Send reset link
          </SubmitButton>
        </form>
      ) : null}

      <p className={styles.footerText}>
        <Link to="/login" className={styles.link}>
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
