/**
 * useAuth.ts
 * ----------------------------------------------------------------------------
 * The hook components should use to read "who's signed in". Wraps
 * authStore so components don't need to know it's Zustand under the hood
 * (or select multiple fields awkwardly) — this indirection also means we
 * could swap the underlying state mechanism later without touching every
 * component that calls useAuth().
 */

import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/user.types';

export interface UseAuthResult {
  /** True once we definitively know whether someone is signed in or not. */
  isReady: boolean;
  /** True if there is a signed-in Firebase Auth user. */
  isAuthenticated: boolean;
  /** uid of the signed-in user, or null. */
  uid: string | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  /** The user's role from their Firestore profile. Defaults to "customer"
   *  for a signed-in user whose profile hasn't loaded yet, which is the
   *  safe (least-privileged) assumption while data is in flight. */
  role: UserRole;
  isDisabled: boolean;
}

export function useAuth(): UseAuthResult {
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  return {
    isReady: !isInitializing,
    isAuthenticated: firebaseUser !== null,
    uid: firebaseUser?.uid ?? null,
    email: firebaseUser?.email ?? null,
    displayName: firebaseUser?.displayName ?? null,
    photoURL: firebaseUser?.photoURL ?? null,
    emailVerified: firebaseUser?.emailVerified ?? false,
    role: profile?.role ?? 'customer',
    isDisabled: profile?.isDisabled ?? false,
  };
}
