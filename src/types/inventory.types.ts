/**
 * inventory.types.ts
 * ----------------------------------------------------------------------------
 * Types for the `inventory` collection — stock levels, kept separate from
 * `products` (see product.types.ts header for why). One document per
 * product *variant*, keyed by `${productId}_${variantId}` so a variant's
 * stock document can be located directly without a query.
 */

import type { AuditFields } from './common.types';

export type StockMovementReason =
  | 'restock'
  | 'sale'
  | 'return'
  | 'damaged'
  | 'manual_correction';

/** An immutable log entry recorded every time stock changes, so admins can
 *  always answer "why does this SKU show 42 units?" by reading history
 *  instead of trusting a single mutable counter. */
export interface StockMovement {
  quantityDelta: number; // positive = stock added, negative = stock removed
  reason: StockMovementReason;
  /** ISO 8601 string — see OrderStatusHistoryEntry.changedAt for why. */
  occurredAt: string;
  actorId: string; // uid of staff member, or "system" for order-driven deductions
  /** Order that triggered this movement, when reason is "sale" or "return". */
  relatedOrderId: string | null;
  note?: string;
}

export interface InventoryDocument extends AuditFields {
  /** `${productId}_${variantId}` — see file header. */
  inventoryId: string;
  productId: string;
  variantId: string;
  sku: string;
  /** Units physically in the warehouse. */
  quantityOnHand: number;
  /** Units on hand minus units already allocated to unfulfilled paid orders —
   *  this is the number the storefront should treat as "purchasable now". */
  quantityAvailable: number;
  /** Below this threshold, the admin dashboard surfaces a low-stock warning. */
  lowStockThreshold: number;
  /** Most recent movements, capped client-side to a reasonable window for
   *  display; full history can be paginated via a subcollection if needed
   *  as volume grows. */
  recentMovements: StockMovement[];
}
