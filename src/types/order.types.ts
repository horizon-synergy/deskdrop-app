/**
 * order.types.ts
 * ----------------------------------------------------------------------------
 * Types for the `orders` collection. An order is an immutable-ish snapshot
 * of what was purchased: line items copy the product name/price/image *at
 * the time of purchase* rather than referencing live product docs, so that
 * a later price change or product deletion never rewrites order history —
 * this is standard e-commerce practice and matters for both bookkeeping
 * and legal/receipt accuracy.
 */

import type { AuditFields, Address, Money } from './common.types';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/** A single purchased line within an order — a frozen copy of product/variant data. */
export interface OrderLineItem {
  productId: string;
  variantId: string;
  /** Snapshot of the variant label/name at purchase time, e.g. "A5 Notebook · Navy". */
  name: string;
  /** Snapshot of the primary product image at purchase time. */
  imageUrl: string;
  sku: string;
  unitPrice: Money;
  quantity: number;
  /** unitPrice * quantity, precomputed to avoid recalculating money math in the UI. */
  lineTotal: Money;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  /** ISO 8601 string (not a Timestamp) because this array is written as one
   *  field-level array-union update; Firestore requires primitive-safe
   *  values for that pattern and an ISO string sorts/serializes cleanly. */
  changedAt: string;
  /** uid of the staff/system actor who made the change, or "system" for
   *  automated transitions (e.g. a payment webhook marking paid). */
  changedBy: string;
  note?: string;
}

export interface OrderDocument extends AuditFields {
  orderId: string;
  /** uid of the customer who placed the order. */
  customerId: string;
  /** Denormalized so admin order lists don't need a join to the users collection. */
  customerEmail: string;
  lineItems: OrderLineItem[];
  shippingAddress: Address;
  billingAddress: Address;
  subtotal: Money;
  shippingCost: Money;
  /** Discount applied from a promotion, if any (see promotion.types.ts). Zero if none. */
  discount: Money;
  tax: Money;
  total: Money;
  /** Code of the promotion applied, or null. Denormalized for admin reporting. */
  appliedPromoCode: string | null;
  status: OrderStatus;
  statusHistory: OrderStatusHistoryEntry[];
  /** Opaque reference to the payment processor's transaction/session ID,
   *  used for reconciliation and refunds — never store card details here. */
  paymentReference: string | null;
  /** Carrier tracking number, set once the order ships. */
  trackingNumber: string | null;
}

/** Fields the client supplies when creating an order at checkout. The
 *  server-computed fields (totals, status, statusHistory, audit fields)
 *  are deliberately excluded — checkout submits *intent*, and totals are
 *  authoritative-recomputed before the order is persisted. */
export type NewOrderInput = Pick<
  OrderDocument,
  'customerId' | 'customerEmail' | 'lineItems' | 'shippingAddress' | 'billingAddress' | 'appliedPromoCode'
>;
