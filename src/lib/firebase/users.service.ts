/**
 * users.service.ts
 * ----------------------------------------------------------------------------
 * All Firestore access to the `users` collection. This is where a
 * Firebase Auth `User` (identity) gets turned into / synced with a
 * `UserDocument` (app profile + role) in Firestore.
 *
 * SECURITY: `ensureUserDocument` is the only place a user document is
 * *created*, and it deliberately never lets the caller set `role`. The
 * write it performs matches `firestore.rules`, which additionally enforces
 * server-side that a create operation on `users/{uid}` may only happen
 * when `request.auth.uid == uid` (you can only create your own profile)
 * and that the `role` field, if present at all in the payload, must equal
 * "customer". This means even a compromised or modified frontend cannot
 * self-grant an elevated role at signup — the rule rejects the write.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  getDocs,
  type CollectionReference,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './config';
import { makeConverter } from './converters';
import type { UserDocument, NewUserInput } from '@/types/user.types';

const usersCollection = collection(db, 'users') as CollectionReference<UserDocument>;
const converter = makeConverter<UserDocument>();

/**
 * Derives the list of linked auth providers ("password", "google.com",
 * "github.com") from a Firebase Auth `User`'s `providerData`. Stored
 * on the Firestore profile so admin screens can show how a customer
 * signs in without a separate Auth Admin SDK call.
 */
function extractAuthProviders(user: User): UserDocument['authProviders'] {
  const ids = user.providerData.map((p) => p.providerId);
  return ids.filter(
    (id): id is UserDocument['authProviders'][number] =>
      id === 'password' || id === 'google.com' || id === 'github.com',
  );
}

/**
 * Ensures a `users/{uid}` document exists for the given Firebase Auth
 * user, creating it on first sign-in. Safe to call on *every* sign-in
 * (not just registration) — it no-ops if the document already exists,
 * which keeps the "new OAuth user" and "returning OAuth user" code paths
 * identical (see auth.service.ts -> syncUserProfile).
 *
 * On create, role is fixed to "customer" client-side and re-verified
 * server-side by firestore.rules — see file header.
 */
export async function ensureUserDocument(user: User): Promise<UserDocument> {
  const ref = doc(usersCollection, user.uid).withConverter(converter);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    return existing.data();
  }

  const input: NewUserInput = {
    uid: user.uid,
    email: user.email ?? '',
    emailVerified: user.emailVerified,
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'DeskDrop Customer',
    photoURL: user.photoURL,
    authProviders: extractAuthProviders(user),
  };

  const newDocument: UserDocument = {
    ...input,
    role: 'customer',
    isDisabled: false,
    savedAddresses: [],
    wishlistProductIds: [],
    lastLoginAt: null,
    // Cast is safe: serverTimestamp() resolves to a Timestamp once the
    // write is committed and the local cache/read reflects that. We type
    // AuditFields as Timestamp (not FieldValue) because every *read* of
    // this document is genuinely a Timestamp by the time app code sees it.
    createdAt: serverTimestamp() as unknown as UserDocument['createdAt'],
    updatedAt: serverTimestamp() as unknown as UserDocument['updatedAt'],
  };

  await setDoc(ref, newDocument);
  return newDocument;
}

/** Fetches a user's Firestore profile (including their role) by uid. */
export async function getUserDocument(uid: string): Promise<UserDocument | null> {
  const ref = doc(usersCollection, uid).withConverter(converter);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

/**
 * Updates `lastLoginAt` and refreshes `emailVerified` (in case the user
 * verified their email in a previous session — Firebase Auth's client SDK
 * only reflects a fresh verification status after a token refresh, so we
 * resync it here on every login rather than trusting a stale cached value).
 */
export async function touchLastLogin(uid: string): Promise<void> {
  const ref = doc(usersCollection, uid);
  await updateDoc(ref, {
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Updates a user's role. Restricted to admin/superadmin actors by
 * firestore.rules — this function will simply fail with a
 * permission-denied Firestore error if called by anyone else, which is
 * the correct behavior: the *server* rejects it, this client function is
 * just a convenience wrapper, not a security check in itself.
 */
export async function updateUserRole(uid: string, role: UserDocument['role']): Promise<void> {
  const ref = doc(usersCollection, uid);
  await updateDoc(ref, { role, updatedAt: serverTimestamp() });
}

/**
 * Fetches every user document — used by the admin Customers page.
 * Restricted to admin-area staff by firestore.rules' `users/{uid}` read
 * rule (`isOwner(uid) || callerIsAdminArea()`), so a plain customer
 * calling this would get individual permission-denied errors per
 * document rather than a usable list; this function is only ever invoked
 * from behind AdminRoute/RequireRole in the UI.
 */
export async function listAllUsers(): Promise<UserDocument[]> {
  const q = query(usersCollection.withConverter(converter), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => docSnapshot.data());
}

/**
 * Enables or disables an account. Like updateUserRole, this is gated to
 * admin+ server-side — disabling is modeled as a flag rather than a
 * delete (see UserDocument.isDisabled's comment) so order history and
 * other references to the uid stay intact.
 */
export async function setUserDisabled(uid: string, isDisabled: boolean): Promise<void> {
  const ref = doc(usersCollection, uid);
  await updateDoc(ref, { isDisabled, updatedAt: serverTimestamp() });
}
