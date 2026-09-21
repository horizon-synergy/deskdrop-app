/**
 * inventory.service.ts
 * ----------------------------------------------------------------------------
 * All Firestore access to the `inventory` collection. Every mutation goes
 * through `adjustStock`, which is the single place that both changes the
 * stock counters AND appends a `StockMovement` record — see
 * inventory.types.ts for why we log movements rather than just mutating a
 * bare counter (auditability: "why does this SKU show 42 units?" should
 * always be answerable from history, not just trusted on faith).
 *
 * Documents are keyed `${productId}_${variantId}` (see InventoryDocument's
 * header comment) so a variant's stock record can be fetched directly by
 * ID without a query, and so `ensureInventoryDoc` can safely be called
 * repeatedly without ever creating a duplicate record for the same variant.
 */

import { doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp, collection, type CollectionReference } from 'firebase/firestore';
import { db } from './config';
import { makeConverter } from './converters';
import type { InventoryDocument, StockMovement, StockMovementReason } from '@/types/inventory.types';

const inventoryCollection = collection(db, 'inventory') as CollectionReference<InventoryDocument>;
const converter = makeConverter<InventoryDocument>();

function inventoryDocId(productId: string, variantId: string): string {
  return `${productId}_${variantId}`;
}

/** Fetches every inventory document — used by the admin Inventory page to
 *  join against the product catalog and render one row per variant. */
export async function listAllInventory(): Promise<InventoryDocument[]> {
  const snapshot = await getDocs(inventoryCollection.withConverter(converter));
  return snapshot.docs.map((docSnapshot) => docSnapshot.data());
}

export async function getInventoryForVariant(
  productId: string,
  variantId: string,
): Promise<InventoryDocument | null> {
  const ref = doc(inventoryCollection, inventoryDocId(productId, variantId)).withConverter(converter);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

/**
 * Creates the inventory record for a variant that doesn't have one yet
 * (e.g. a product/variant created before it was ever stocked), seeded at
 * zero with a default low-stock threshold. Safe to call even if a record
 * already exists — it no-ops in that case, mirroring the
 * ensureUserDocument pattern in users.service.ts.
 */
export async function ensureInventoryDoc(productId: string, variantId: string, sku: string): Promise<InventoryDocument> {
  const ref = doc(inventoryCollection, inventoryDocId(productId, variantId)).withConverter(converter);
  const existing = await getDoc(ref);
  if (existing.exists()) return existing.data();

  const newDoc: InventoryDocument = {
    inventoryId: inventoryDocId(productId, variantId),
    productId,
    variantId,
    sku,
    quantityOnHand: 0,
    quantityAvailable: 0,
    lowStockThreshold: 5,
    recentMovements: [],
    createdAt: serverTimestamp() as unknown as InventoryDocument['createdAt'],
    updatedAt: serverTimestamp() as unknown as InventoryDocument['updatedAt'],
  };
  await setDoc(ref, newDoc);
  return newDoc;
}

/** Cap on how many movements we keep inline on the document itself —
 *  see inventory.types.ts, which notes full history could move to a
 *  subcollection if this ever needs to grow unbounded. */
const MAX_INLINE_MOVEMENTS = 50;

interface AdjustStockInput {
  productId: string;
  variantId: string;
  quantityDelta: number;
  reason: StockMovementReason;
  actorId: string;
  relatedOrderId?: string;
  note?: string;
}

/**
 * Applies a stock movement: updates both counters and prepends a
 * StockMovement entry to `recentMovements` (trimmed to the most recent
 * MAX_INLINE_MOVEMENTS). `quantityAvailable` moves in lockstep with
 * `quantityOnHand` here since this pass doesn't yet model separate
 * "allocated to unfulfilled paid orders" tracking (see
 * inventory.types.ts) — that's the natural follow-up once Orders
 * fulfillment actually reserves stock at payment time.
 */
export async function adjustStock(input: AdjustStockInput): Promise<void> {
  const ref = doc(inventoryCollection, inventoryDocId(input.productId, input.variantId)).withConverter(converter);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    throw new Error('No inventory record exists for this variant yet. Initialize it first.');
  }

  const current = existing.data();
  const nextQuantity = current.quantityOnHand + input.quantityDelta;
  if (nextQuantity < 0) {
    throw new Error('This adjustment would make stock negative.');
  }

  const movement: StockMovement = {
    quantityDelta: input.quantityDelta,
    reason: input.reason,
    occurredAt: new Date().toISOString(),
    actorId: input.actorId,
    relatedOrderId: input.relatedOrderId ?? null,
    ...(input.note ? { note: input.note } : {}),
  };

  const updatedMovements = [movement, ...current.recentMovements].slice(0, MAX_INLINE_MOVEMENTS);

  await updateDoc(ref, {
    quantityOnHand: nextQuantity,
    quantityAvailable: nextQuantity,
    recentMovements: updatedMovements,
    updatedAt: serverTimestamp(),
  });
}

export async function updateLowStockThreshold(
  productId: string,
  variantId: string,
  lowStockThreshold: number,
): Promise<void> {
  const ref = doc(inventoryCollection, inventoryDocId(productId, variantId));
  await updateDoc(ref, { lowStockThreshold, updatedAt: serverTimestamp() });
}
