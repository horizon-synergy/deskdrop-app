/**
 * OAuthButtons.tsx
 * ----------------------------------------------------------------------------
 * Google + GitHub sign-in buttons, shared between LoginPage and
 * RegisterPage (a Google/GitHub popup performs sign-in OR sign-up
 * transparently, so both pages wire up to the exact same two handlers —
 * see auth.service.ts -> signInWithGoogle / signInWithGithub).
 */

import type { ReactElement } from 'react';
import styles from './OAuthButtons.module.css';

interface OAuthButtonsProps {
  onGoogleClick: () => void;
  onGithubClick: () => void;
  /** Disables both buttons while any auth request is in flight, so a user
   *  can't fire off two competing popups at once. */
  disabled: boolean;
}

export function OAuthButtons({
  onGoogleClick,
  onGithubClick,
  disabled,
}: OAuthButtonsProps): ReactElement {
  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.oauthButton}
        onClick={onGoogleClick}
        disabled={disabled}
        aria-label="Continue with Google"
      >
        <GoogleIcon />
        Continue with Google
      </button>
      <button
        type="button"
        className={styles.oauthButton}
        onClick={onGithubClick}
        disabled={disabled}
        aria-label="Continue with GitHub"
      >
        <GithubIcon />
        Continue with GitHub
      </button>
    </div>
  );
}

/** Inline brand-accurate icons (kept local — these are third-party brand
 *  marks, not part of the Heroicons set the rest of the app uses). */
function GoogleIcon(): ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.61z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.19l-2.91-2.26c-.81.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function GithubIcon(): ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#181717"
        d="M9 0a9 9 0 0 0-2.85 17.54c.45.08.62-.2.62-.44v-1.7c-2.5.55-3.03-1.07-3.03-1.07-.41-1.04-1-1.32-1-1.32-.82-.56.06-.55.06-.55.9.06 1.38.93 1.38.93.8 1.38 2.1.98 2.62.75.08-.58.32-.98.57-1.21-2-.23-4.1-1-4.1-4.45 0-.98.35-1.79.92-2.42-.09-.23-.4-1.15.09-2.39 0 0 .75-.24 2.46.92a8.5 8.5 0 0 1 4.48 0c1.71-1.16 2.46-.92 2.46-.92.49 1.24.18 2.16.09 2.39.57.63.92 1.44.92 2.42 0 3.46-2.11 4.22-4.12 4.44.33.28.62.84.62 1.7v2.51c0 .24.16.53.62.44A9 9 0 0 0 9 0z"
      />
    </svg>
  );
}
