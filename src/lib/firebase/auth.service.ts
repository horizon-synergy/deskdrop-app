/**
 * auth.service.ts
 * ----------------------------------------------------------------------------
 * Thin, typed wrapper around Firebase Authentication. This is the *only*
 * file in the app that calls `firebase/auth` functions directly for
 * sign-in/sign-up/sign-out flows (Zustand's authStore also touches
 * `onAuthStateChanged`, since that's state-subscription rather than an
 * "action"). Routing this through one module means:
 *   - every auth error is normalized to a single `AuthServiceError` shape,
 *     so UI code never has to know Firebase's internal error-code strings;
 *   - it's the one place to add things like rate-limit handling or
 *     analytics hooks later without touching every page that logs a user in.
 *
 * Every function here returns a `Promise` and throws `AuthServiceError` on
 * failure — callers (pages, hooks) are expected to catch and display
 * `error.message`, which is already a user-safe, human-readable string.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  type User,
  type AuthError,
} from 'firebase/auth';
import { auth, googleAuthProvider, githubAuthProvider } from './config';
import { ensureUserDocument, touchLastLogin } from './users.service';

/** Normalized error shape thrown by every function in this file. */
export class AuthServiceError extends Error {
  /** The original Firebase error code (e.g. "auth/wrong-password"), kept
   *  around for logging/debugging even though `message` is already
   *  user-friendly. */
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
  }
}

/**
 * Firebase's raw error codes are technical and inconsistent to show
 * directly to end users ("auth/invalid-credential" tells a customer
 * nothing useful). This maps the codes we expect to hit in normal usage
 * to clear, actionable copy, and falls back to a generic message for
 * anything unmapped so we never leak internal error details.
 */
function normalizeAuthError(error: unknown): AuthServiceError {
  const firebaseError = error as AuthError;
  const code = firebaseError?.code ?? 'auth/unknown-error';

  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/weak-password': 'Please choose a stronger password (at least 8 characters).',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/account-exists-with-different-credential':
      'An account already exists with this email using a different sign-in method.',
    'auth/user-disabled': 'This account has been disabled. Contact support for help.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  };

  return new AuthServiceError(code, messages[code] ?? 'Something went wrong. Please try again.');
}

/**
 * After ANY successful sign-in or registration, we run this same
 * bookkeeping step: make sure a Firestore `users/{uid}` document exists
 * (creating it with role "customer" on first-ever sign-in) and stamp
 * `lastLoginAt`. Centralizing it here guarantees every auth entry point —
 * email/password, Google, GitHub — ends up with a consistent Firestore
 * profile, instead of duplicating this logic in three places.
 */
async function syncUserProfile(user: User): Promise<void> {
  await ensureUserDocument(user);
  await touchLastLogin(user.uid);
}

/**
 * Registers a new account with email + password, sets the account's
 * display name, sends the verification email, and creates the matching
 * Firestore user document.
 *
 * Email verification is *sent* but not *required* to proceed past
 * registration — the app lets an unverified user browse/shop (see
 * ProtectedRoute), but verification status is surfaced in the profile
 * page and can be required later for specific actions (e.g. leaving
 * reviews) by checking `user.emailVerified`.
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    await sendEmailVerification(credential.user);
    await syncUserProfile(credential.user);
    return credential.user;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

/** Signs in an existing email/password account. */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await syncUserProfile(credential.user);
    return credential.user;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

/**
 * Signs in (or, on first use, registers) via a Google popup. Firebase
 * treats "new OAuth user" and "returning OAuth user" identically at the
 * SDK level — `ensureUserDocument` is what distinguishes first-time users
 * by checking whether a Firestore doc already exists for that uid.
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    await syncUserProfile(credential.user);
    return credential.user;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

/** Signs in (or registers) via a GitHub popup. See signInWithGoogle above. */
export async function signInWithGithub(): Promise<User> {
  try {
    const credential = await signInWithPopup(auth, githubAuthProvider);
    await syncUserProfile(credential.user);
    return credential.user;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

/**
 * Sends a password-reset email. Deliberately does not reveal whether the
 * email address is actually registered (Firebase itself resolves this
 * promise successfully regardless, which is the correct behavior — it
 * prevents this endpoint being used to enumerate which emails have
 * accounts on the platform).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

/** Re-sends the verification email to the currently signed-in user. */
export async function resendEmailVerification(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new AuthServiceError('auth/no-current-user', 'You must be signed in to do that.');
  }
  try {
    await sendEmailVerification(user);
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

/** Signs the current user out of this device/browser. */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw normalizeAuthError(error);
  }
}
