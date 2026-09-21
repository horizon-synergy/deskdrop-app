/**
 * authStore.ts
 * ----------------------------------------------------------------------------
 * Single source of truth for "who is signed in and what's their role",
 * shared across the whole app via Zustand. We use a store (rather than
 * plain React Context) because a lot of non-component code — route
 * guards, service-layer permission checks — needs synchronous access to
 * the current user without being inside a React render.
 *
 * The store is fed by exactly one Firebase `onAuthStateChanged`
 * subscription, started once from `App.tsx` via `initAuthListener()`.
 * That's deliberate: `onAuthStateChanged` fires on every token refresh,
 * and having more than one subscription running would mean redundant
 * Firestore reads of the user's profile document.
 */

import { create } from 'zustand';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserDocument } from '@/lib/firebase/users.service';
import type { UserDocument } from '@/types/user.types';

interface AuthState {
  /** The raw Firebase Auth user (identity), or null if signed out. */
  firebaseUser: User | null;
  /** The Firestore profile document (role, addresses, ...), or null if
   *  signed out or not yet loaded. */
  profile: UserDocument | null;
  /**
   * True until the *first* `onAuthStateChanged` callback has fired.
   * Firebase Auth's initial state is always "unknown" for a brief moment
   * while it checks IndexedDB for a persisted session — route guards use
   * this flag to render a loading state instead of incorrectly redirecting
   * a genuinely-signed-in user to /login before their session is restored.
   */
  isInitializing: boolean;
  /** Set internally while re-fetching the profile doc (e.g. after a role change). */
  isProfileLoading: boolean;
}

interface AuthActions {
  /** Starts the onAuthStateChanged subscription. Call once, from App.tsx. */
  initAuthListener: () => () => void;
  /** Re-fetches the current user's profile doc from Firestore — useful
   *  after an action that changes it, e.g. a superadmin editing their own role. */
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  firebaseUser: null,
  profile: null,
  isInitializing: true,
  isProfileLoading: false,

  initAuthListener: () => {
    // onAuthStateChanged returns an unsubscribe function; App.tsx calls
    // this inside a useEffect and returns it as the cleanup function.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        set({ firebaseUser: null, profile: null, isInitializing: false });
        return;
      }

      set({ firebaseUser, isProfileLoading: true });
      try {
        const profile = await getUserDocument(firebaseUser.uid);

        // A disabled account (see users.service.ts -> setUserDisabled)
        // must actually be blocked from using the app, not just show a
        // "Disabled" badge in the admin Customers list — otherwise that
        // control would be cosmetic. We can't prevent Firebase Auth
        // itself from having already authenticated this session client-
        // side, so we immediately sign the session back out and treat it
        // as signed-out from here on. (For a fully server-enforced block
        // — e.g. rejecting the sign-in attempt itself — the Firebase
        // Admin SDK's `disabled` user flag would need to be kept in sync
        // via a Cloud Function trigger on this same field; that's an
        // infrastructure piece outside this client-only pass.)
        if (profile?.isDisabled) {
          await signOut(auth);
          set({ firebaseUser: null, profile: null, isProfileLoading: false, isInitializing: false });
          return;
        }

        set({ profile, isProfileLoading: false, isInitializing: false });
      } catch {
        // If the profile fetch fails (e.g. transient network error), we
        // still mark initialization as complete with a null profile
        // rather than leaving the app stuck on a loading screen forever.
        // Route guards treat "signed in but no profile" as the lowest
        // privilege level, never as elevated access.
        set({ profile: null, isProfileLoading: false, isInitializing: false });
      }
    });
    return unsubscribe;
  },

  refreshProfile: async () => {
    const { firebaseUser } = get();
    if (!firebaseUser) return;
    set({ isProfileLoading: true });
    const profile = await getUserDocument(firebaseUser.uid);
    set({ profile, isProfileLoading: false });
  },
}));
