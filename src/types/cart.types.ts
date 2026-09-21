/**
 * cart.types.ts
 * ----------------------------------------------------------------------------
 * The cart is intentionally NOT a Firestore collection. It's ephemeral,
 * client-side, pre-purchase state — persisting it in Firestore would mean
 * a round-trip write on every quantity tweak for data that only matters
 * until checkout, at which point it's converted into a real `OrderDocument`
 * (see order.types.ts) and the cart is cleared. See store/cartStore.ts for
 * where this is held (Zustand + localStorage persistence, so a cart
 * survives a page refresh without needing a network round-trip).
 *
 * Each line item snapshots enough product/variant data to render the cart
 * UI without a Firestore read on every render — but unlike an
 * OrderLineItem, this snapshot is considered STALE at checkout time and
 * is not trusted for pricing; see checkout's use of getProduct() to
 * re-fetch authoritative current prices before creating the order.
 */

import type { Money } from './common.types';

export interface CartLineItem {
  productId: string;
  variantId: string;
  productSlug: string;
  name: string;
  imageUrl: string;
  sku: string;
  unitPrice: Money;
  quantity: number;
}
