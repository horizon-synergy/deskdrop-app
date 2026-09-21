/**
 * wishlist.service.ts
 * ----------------------------------------------------------------------------
 * A user's wishlist is stored as `wishlistProductIds` on their own
 * `users/{uid}` document (see user.types.ts for why). This file wraps the
 * two mutations (add/remove) using Firestore's `arrayUnion`/`arrayRemove`
 * field transforms, which are safe under concurrent writes (e.g. adding
 * the same product from two open tabs doesn't produce a duplicate entry
 * the way a naive read-modify-write would).
 *
 * Authorization: covered by the existing `users/{uid}` update rule in
 * firestore.rules — a user may update their own document as long as
 * `role` and `isDisabled` are unchanged, which a wishlist edit always
 * satisfies. No rules changes were needed to add this feature.
 */

import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

export async function addToWishlist(uid: string, productId: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    wishlistProductIds: arrayUnion(productId),
    updatedAt: serverTimestamp(),
  });
}

export async function removeFromWishlist(uid: string, productId: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    wishlistProductIds: arrayRemove(productId),
    updatedAt: serverTimestamp(),
  });
}
