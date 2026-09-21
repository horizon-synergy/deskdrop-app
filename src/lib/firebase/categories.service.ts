/**
 * categories.service.ts
 * ----------------------------------------------------------------------------
 * All Firestore access to the `categories` collection. Reads are public
 * (see firestore.rules — the storefront needs to browse categories without
 * signing in); writes require the `manager` role or above, enforced
 * server-side by the same rules file — this service does not itself
 * check the caller's role, since duplicating that check client-side would
 * only ever be a UX nicety, never a real gate (see AdminRoute.tsx /
 * usePermission.ts for where that UX-level check actually belongs).
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
  type CollectionReference,
} from 'firebase/firestore';
import { db } from './config';
import { makeConverter } from './converters';
import type { CategoryDocument, NewCategoryInput } from '@/types/category.types';

const categoriesCollection = collection(db, 'categories') as CollectionReference<CategoryDocument>;
const converter = makeConverter<CategoryDocument>();

/** Fetches every category, ordered for display (manual displayOrder, then name). */
export async function listCategories(): Promise<CategoryDocument[]> {
  const q = query(categoriesCollection.withConverter(converter), orderBy('displayOrder', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => docSnapshot.data());
}

export async function getCategory(categoryId: string): Promise<CategoryDocument | null> {
  const ref = doc(categoriesCollection, categoryId).withConverter(converter);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

/**
 * Creates a new category. Firestore auto-generates the document ID; we
 * immediately write that ID back onto the document as `categoryId` in a
 * follow-up update so every document is self-describing (readable
 * directly off the object without also threading the doc ID separately
 * through the UI layer).
 */
export async function createCategory(input: NewCategoryInput): Promise<string> {
  const docRef = await addDoc(categoriesCollection, {
    ...input,
    categoryId: '', // placeholder, corrected immediately below
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as CategoryDocument);

  await updateDoc(docRef, { categoryId: docRef.id });
  return docRef.id;
}

export async function updateCategory(
  categoryId: string,
  input: Partial<NewCategoryInput>,
): Promise<void> {
  const ref = doc(categoriesCollection, categoryId);
  await updateDoc(ref, { ...input, updatedAt: serverTimestamp() });
}

/**
 * Deletes a category outright. Only safe to expose for categories with no
 * products assigned — the admin UI (AdminCategoriesPage) checks this
 * before calling, and firestore.rules independently gates the operation
 * to manager+ regardless.
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  const ref = doc(categoriesCollection, categoryId);
  await deleteDoc(ref);
}
