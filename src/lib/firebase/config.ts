/**
 * config.ts
 * ----------------------------------------------------------------------------
 * The one and only place `initializeApp` is called. Every other file that
 * needs Firebase Auth/Firestore imports the already-initialized instances
 * from here rather than calling `getAuth()`/`getFirestore()` themselves.
 * That keeps configuration centralized and makes it trivial to, e.g., wire
 * up the Firestore emulator for local development in a single spot later.
 */

import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  GoogleAuthProvider,
  GithubAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Read config from Vite's `import.meta.env`. All of these are `VITE_`-
 * prefixed so Vite exposes them to client code (see .env.example for the
 * full list and why these particular values are safe to ship to the
 * browser). We fail fast and loudly if any are missing rather than
 * silently initializing Firebase with `undefined` values, which would
 * otherwise surface as confusing runtime errors deep inside the SDK.
 */
function readRequiredEnvVar(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${key}". Copy .env.example to ` +
        `.env.local and fill in your Firebase project credentials.`,
    );
  }
  return value;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: readRequiredEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: readRequiredEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readRequiredEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readRequiredEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readRequiredEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readRequiredEnvVar('VITE_FIREBASE_APP_ID'),
};

export const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

/**
 * Session persistence: `browserLocalPersistence` keeps the user signed in
 * across browser restarts/tabs (stored in IndexedDB/localStorage), which is
 * the expected behavior for a consumer storefront ("stay logged in").
 * We set this explicitly rather than relying on the SDK default so the
 * behavior is documented and intentional rather than implicit.
 *
 * The returned promise is intentionally not awaited at the top level here —
 * `onAuthStateChanged` (wired up in authStore.ts) will still fire correctly
 * once persistence is configured, and callers don't need to block app
 * startup on this resolving.
 */
void setPersistence(auth, browserLocalPersistence);

/**
 * OAuth provider instances, configured once and reused. Adding
 * `prompt: 'select_account'` to Google avoids the browser silently
 * re-using a previously chosen Google account when the user actually
 * wants to switch accounts.
 */
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export const githubAuthProvider = new GithubAuthProvider();
