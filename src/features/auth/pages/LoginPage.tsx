/**
 * LoginPage.tsx
 * ----------------------------------------------------------------------------
 * Public route: /login
 *
 * Handles email/password sign-in and Google/GitHub OAuth sign-in. On
 * success, redirects the user back to whichever page sent them here (see
 * ProtectedRoute.tsx, which stashes `location.pathname` into navigation
 * state as `from`), falling back to the homepage for a direct visit to
 * /login.
 *
 * Form validation is handled by React Hook Form's built-in validation
 * rules (no separate schema library needed for a form this simple) —
 * `mode: 'onBlur'` gives immediate per-field feedback without being
 * noisy on every keystroke.
 */

import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '@/components/form/FormField';
import { SubmitButton } from '@/components/form/SubmitButton';
import { FormBanner } from '@/components/form/FormBanner';
import { OAuthButtons } from '../components/OAuthButtons';
import { OrDivider } from '../components/OrDivider';
import { signInWithEmail, signInWithGoogle, signInWithGithub, AuthServiceError } from '@/lib/firebase/auth.service';
import styles from './AuthForm.module.css';

interface LoginFormValues {
  email: string;
  password: string;
}

/** Shape of the navigation state ProtectedRoute/AdminRoute attach when
 *  redirecting an unauthenticated user to /login. */
interface LoginLocationState {
  from?: string;
}

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [isOAuthSubmitting, setIsOAuthSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ mode: 'onBlur' });

  /** Where to send the user after a successful sign-in. */
  function redirectDestination(): string {
    const state = location.state as LoginLocationState | null;
    return state?.from ?? '/';
  }

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setFormError(null);
    try {
      await signInWithEmail(values.email, values.password);
      navigate(redirectDestination(), { replace: true });
    } catch (error) {
      setFormError(error instanceof AuthServiceError ? error.message : 'Something went wrong. Please try again.');
    }
  }

  async function handleOAuth(provider: 'google' | 'github'): Promise<void> {
    setFormError(null);
    setIsOAuthSubmitting(true);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithGithub();
      }
      navigate(redirectDestination(), { replace: true });
    } catch (error) {
      setFormError(error instanceof AuthServiceError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsOAuthSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isOAuthSubmitting;

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back to DeskDrop.">
      {formError ? <FormBanner tone="error" message={formError} /> : null}

      <OAuthButtons
        onGoogleClick={() => void handleOAuth('google')}
        onGithubClick={() => void handleOAuth('github')}
        disabled={isBusy}
      />

      <OrDivider />

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
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Password is required.' })}
        />

        <div className={styles.rowBetween}>
          <Link to="/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
        </div>

        <SubmitButton isSubmitting={isSubmitting} busyLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      <p className={styles.footerText}>
        New to DeskDrop?{' '}
        <Link to="/register" className={styles.link}>
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
