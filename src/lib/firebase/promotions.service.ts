/**
 * promotions.service.ts
 * ----------------------------------------------------------------------------
 * All Firestore access to the `promotions` collection. Reads are public
 * (checkout needs to validate a code without requiring sign-in first —
 * see firestore.rules), writes are manager+.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  limit as firestoreLimit,
  type CollectionReference,
} from 'firebase/firestore';
import { db } from './config';
import { makeConverter } from './converters';
import type { PromotionDocument } from '@/types/promotion.types';

const promotionsCollection = collection(db, 'promotions') as CollectionReference<PromotionDocument>;
const converter = makeConverter<PromotionDocument>();

export type NewPromotionInput = Pick<
  PromotionDocument,
  | 'code'
  | 'description'
  | 'discountType'
  | 'discountValue'
  | 'minimumSubtotal'
  | 'startsAt'
  | 'endsAt'
  | 'usageLimit'
  | 'isActive'
>;

export async function listPromotions(): Promise<PromotionDocument[]> {
  const q = query(promotionsCollection.withConverter(converter), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => docSnapshot.data());
}

/**
 * Looks up an active promotion by its customer-entered code, for
 * checkout validation. Codes are always stored upper-cased (see
 * createPromotion) so lookups are case-insensitive from the shopper's
 * perspective without needing a separate normalized-field index.
 */
export async function getPromotionByCode(code: string): Promise<PromotionDocument | null> {
  const q = query(
    promotionsCollection.withConverter(converter),
    where('code', '==', code.trim().toUpperCase()),
    firestoreLimit(1),
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : (snapshot.docs[0]?.data() ?? null);
}

export async function createPromotion(input: NewPromotionInput): Promise<string> {
  const docRef = await addDoc(promotionsCollection, {
    ...input,
    code: input.code.trim().toUpperCase(),
    promotionId: '',
    timesUsed: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as PromotionDocument);

  await updateDoc(docRef, { promotionId: docRef.id });
  return docRef.id;
}

export async function updatePromotion(promotionId: string, input: Partial<NewPromotionInput>): Promise<void> {
  const ref = doc(promotionsCollection, promotionId);
  const payload = input.code ? { ...input, code: input.code.trim().toUpperCase() } : input;
  await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() });
}

export async function deletePromotion(promotionId: string): Promise<void> {
  const ref = doc(promotionsCollection, promotionId);
  await deleteDoc(ref);
}

/** Used by AdminPromotionsPage to block deleting/deactivating a code that's
 *  already been redeemed at least once, preserving order-history integrity
 *  (orders reference `appliedPromoCode` by string, not by document ID). */
export async function getPromotion(promotionId: string): Promise<PromotionDocument | null> {
  const ref = doc(promotionsCollection, promotionId).withConverter(converter);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}
