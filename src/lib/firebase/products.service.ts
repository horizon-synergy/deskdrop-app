/**
 * products.service.ts
 * ----------------------------------------------------------------------------
 * All Firestore access to the `products` collection. Same read/write
 * split as categories.service.ts: public reads, manager+ writes enforced
 * by firestore.rules. This file also owns the small amount of derived
 * logic around slugs and variants that's specific to how products are
 * shaped (see product.types.ts).
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
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { makeConverter } from './converters';
import type { ProductDocument, NewProductInput, ProductStatus } from '@/types/product.types';

const productsCollection = collection(db, 'products') as CollectionReference<ProductDocument>;
const converter = makeConverter<ProductDocument>();

interface ListProductsOptions {
  /** Filter to a single status; omit to fetch all statuses (admin use only —
   *  the public storefront should always pass status: 'active'). */
  status?: ProductStatus;
  /** Filter to products that include this category ID. */
  categoryId?: string;
  maxResults?: number;
}

/**
 * Fetches products for the admin product list or the public shop grid,
 * depending on the options passed. Firestore requires a composite index
 * for the (status + categoryId + createdAt) combination if all three
 * filters are used together — the Firebase console will surface a direct
 * link to create it the first time this combination runs, which is the
 * normal Firestore workflow for adding indexes as query patterns emerge.
 */
export async function listProducts(options: ListProductsOptions = {}): Promise<ProductDocument[]> {
  const constraints: QueryConstraint[] = [];
  if (options.status) constraints.push(where('status', '==', options.status));
  if (options.categoryId) constraints.push(where('categoryIds', 'array-contains', options.categoryId));
  constraints.push(orderBy('createdAt', 'desc'));
  if (options.maxResults) constraints.push(firestoreLimit(options.maxResults));

  const q = query(productsCollection.withConverter(converter), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => docSnapshot.data());
}

export async function getProduct(productId: string): Promise<ProductDocument | null> {
  const ref = doc(productsCollection, productId).withConverter(converter);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

/** Looks up a single product by its public-facing slug, for the product
 *  detail page route (e.g. /shop/a5-ruled-notebook). */
export async function getProductBySlug(slug: string): Promise<ProductDocument | null> {
  const q = query(productsCollection.withConverter(converter), where('slug', '==', slug), firestoreLimit(1));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : (snapshot.docs[0]?.data() ?? null);
}

export async function createProduct(input: NewProductInput): Promise<string> {
  const docRef = await addDoc(productsCollection, {
    ...input,
    productId: '', // corrected immediately below, see categories.service.ts for the same pattern
    averageRating: 0,
    reviewCount: 0,
    unitsSold: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as ProductDocument);

  await updateDoc(docRef, { productId: docRef.id });
  return docRef.id;
}

export async function updateProduct(productId: string, input: Partial<NewProductInput>): Promise<void> {
  const ref = doc(productsCollection, productId);
  await updateDoc(ref, { ...input, updatedAt: serverTimestamp() });
}

/**
 * Products are archived, not hard-deleted, once they've ever been
 * purchasable — order line items snapshot their own data (see
 * order.types.ts), but the product document itself may still be
 * referenced by review threads, analytics, and "buy again" flows, so
 * removing it outright would break those. `archiveProduct` simply flips
 * status to 'archived', which also removes it from public listings
 * (public reads filter on status: 'active').
 */
export async function archiveProduct(productId: string): Promise<void> {
  await updateProduct(productId, { status: 'archived' });
}

/** Hard-delete, reserved for products still in `draft` status that were
 *  never published and therefore can't be referenced by any order. The
 *  admin UI only exposes this action for draft products. */
export async function deleteDraftProduct(productId: string): Promise<void> {
  const ref = doc(productsCollection, productId);
  await deleteDoc(ref);
}
