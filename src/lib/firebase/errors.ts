/**
 * errors.ts
 * ----------------------------------------------------------------------------
 * Every admin form in this app currently catches Firestore write failures
 * and shows a generic "Could not save. Please try again." — which is
 * fine for the user, but it was swallowing the ACTUAL error (most
 * commonly `permission-denied` from firestore.rules) with nothing logged
 * anywhere, making it impossible to self-diagnose why a save failed.
 *
 * `describeFirestoreError` fixes that: it always logs the real error to
 * the console first (so it shows up in DevTools regardless of what the
 * UI displays), and returns a message that's specific when we can be
 * specific — `permission-denied` almost always means either "your
 * account's role doesn't meet this collection's minimum" or "the
 * Firestore rules for this project haven't been deployed yet" — and
 * falls back to a generic message otherwise.
 */

import { FirestoreError } from 'firebase/firestore';

export function describeFirestoreError(error: unknown, fallback: string): string {
  // Always log the real error — this is the single most useful line in
  // this file. Whatever the UI ends up showing, the actual Firebase
  // error code and message are now in the console.
  console.error('Firestore operation failed:', error);

  if (error instanceof FirestoreError && error.code === 'permission-denied') {
    return (
      "You don't have permission to do this. Either your account's role " +
      "doesn't meet this action's minimum, or this project's Firestore " +
      'security rules (firestore.rules) haven\u2019t been deployed yet — ' +
      'check the browser console for the full error.'
    );
  }

  return fallback;
}
