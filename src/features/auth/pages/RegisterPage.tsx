/**
 * RegisterPage.tsx
 * ----------------------------------------------------------------------------
 * Public route: /register
 *
 * Creates a new account (email/password, Google, or GitHub). On a
 * successful email/password registration, `registerWithEmail` (see
 * auth.service.ts) has already:
 *   1. created the Firebase Auth account,
 *   2. set the display name,
 *   3. triggered a verification email,
 *   4. created the Firestore `users/{uid}` profile document with role
 *      "customer".
 * This page's job afterward is purely UI: tell the user to check their
 * inbox and send them into the app (we do NOT block access on
 * verification — see ProtectedRoute.tsx / product decision notes in
 * auth.service.ts).
 */

import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '@/components/form/FormField';
import { SubmitButton } from '@/components/form/SubmitButton';
import { FormBanner } from '@/components/form/FormBanner';
import { OAuthButtons } from '../components/OAuthButtons';
import { OrDivider } from '../components/OrDivider';
import {
  registerWithEmail,
  signInWithGoogle,
  signInWithGithub,
  AuthServiceError,
} from '@/lib/firebase/auth.service';
import styles from './AuthForm.module.css';

interface RegisterFormValues {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function RegisterPage(): ReactElement {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [isOAuthSubmitting, setIsOAuthSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ mode: 'onBlur' });

  // Watched so the confirmPassword field's validation rule can compare
  // against the live value of `password` rather than a stale snapshot.
  const passwordValue = watch('password');

  async function onSubmit(values: RegisterFormValues): Promise<void> {
    setFormError(null);
    try {
      await registerWithEmail(values.email, values.password, values.displayName.trim());
      // Redirect into the app rather than to a dedicated "check your
      // email" page — a verification banner lives on Profile/Orders for
      // any session where emailVerified is still false, so the prompt
      // persists until the user actually verifies rather than being a
      // one-time screen they might miss.
      navigate('/', { replace: true });
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
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(error instanceof AuthServiceError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsOAuthSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isOAuthSubmitting;

  return (
    <AuthLayout title="Create your account" subtitle="Join DeskDrop to start shopping.">
      {formError ? <FormBanner tone="error" message={formError} /> : null}

      <OAuthButtons
        onGoogleClick={() => void handleOAuth('google')}
        onGithubClick={() => void handleOAuth('github')}
        disabled={isBusy}
      />

      <OrDivider />

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <FormField
          label="Full name"
          type="text"
          autoComplete="name"
          error={errors.displayName?.message}
          {...register('displayName', {
            required: 'Please enter your name.',
            minLength: { value: 2, message: 'Name must be at least 2 characters.' },
          })}
        />
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required.',
            minLength: { value: 8, message: 'Password must be at least 8 characters.' },
          })}
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password.',
            validate: (value) => value === passwordValue || 'Passwords do not match.',
          })}
        />

        <p className={styles.hint}>
          By creating an account you agree to DeskDrop&apos;s Terms of Service and Privacy Policy.
        </p>

        <SubmitButton isSubmitting={isSubmitting} busyLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>

      <p className={styles.footerText}>
        Already have an account?{' '}
        <Link to="/login" className={styles.link}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
