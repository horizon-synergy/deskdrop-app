/**
 * orders.service.ts
 * ----------------------------------------------------------------------------
 * All Firestore access to the `orders` collection.
 *
 * IMPORTANT HONESTY NOTE about checkout in this pass: DeskDrop's stack (as
 * specified) doesn't yet include a payment processor integration (Stripe,
 * PayFast, etc. — none was specified, and wiring one up is its own
 * integration decision). So `createOrder` here does the real, correct
 * thing for everything EXCEPT taking payment: it re-fetches authoritative
 * current prices from `products` (never trusts cart-snapshot prices — the
 * cart is client state that could be stale or, in a hostile client,
 * tampered with), computes real totals, and persists a genuine
 * `OrderDocument` with status `pending_payment`. What happens after that
 * — redirecting to a payment provider and flipping status to `paid` — is
 * intentionally left as the next integration step rather than being
 * faked with a button that just marks the order "paid" client-side
 * (which would be both dishonest about payment having occurred AND a
 * security hole, which is exactly why firestore.rules only allows
 * customers to create orders in `pending_payment` status and never lets
 * them set any other status).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  type CollectionReference,
} from 'firebase/firestore';
import { db } from './config';
import { makeConverter } from './converters';
import { getProduct } from './products.service';
import { sumMoney } from '@/lib/utils/money';
import type { OrderDocument, OrderLineItem } from '@/types/order.types';
import type { CartLineItem } from '@/types/cart.types';
import type { Address, Money } from '@/types/common.types';

const ordersCollection = collection(db, 'orders') as CollectionReference<OrderDocument>;
const converter = makeConverter<OrderDocument>();

/** Flat shipping rate for this pass — real carrier-rate shopping (by
 *  weight/destination) is a checkout enhancement for later; this is a
 *  genuine, applied value, not a placeholder. */
const FLAT_SHIPPING_COST: Money = { amountInMinorUnits: 500, currency: 'USD' };
const FREE_SHIPPING_THRESHOLD_MINOR_UNITS = 5000; // orders over $50 ship free

export class OrderServiceError extends Error {}

/**
 * Re-fetches each cart line's product from Firestore and rebuilds it as
 * an authoritative OrderLineItem using the CURRENT price and product
 * data, discarding whatever price was cached in the client-side cart.
 * Throws if a product/variant has been removed or archived since it was
 * added to the cart, with a message the checkout page surfaces directly.
 */
async function buildLineItemsFromCart(cartItems: CartLineItem[]): Promise<OrderLineItem[]> {
  const lineItems: OrderLineItem[] = [];

  for (const cartItem of cartItems) {
    const product = await getProduct(cartItem.productId);
    if (!product || product.status !== 'active') {
      throw new OrderServiceError(`"${cartItem.name}" is no longer available. Please remove it from your cart.`);
    }
    const variant = product.variants.find((v) => v.variantId === cartItem.variantId);
    if (!variant) {
      throw new OrderServiceError(`"${cartItem.name}" is no longer available in that option. Please remove it from your cart.`);
    }

    lineItems.push({
      productId: product.productId,
      variantId: variant.variantId,
      name: `${product.name} — ${variant.label}`,
      imageUrl: product.imageUrls[0] ?? '',
      sku: variant.sku,
      unitPrice: variant.price,
      quantity: cartItem.quantity,
      lineTotal: {
        amountInMinorUnits: variant.price.amountInMinorUnits * cartItem.quantity,
        currency: variant.price.currency,
      },
    });
  }

  return lineItems;
}

interface PlaceOrderInput {
  customerId: string;
  customerEmail: string;
  cartItems: CartLineItem[];
  shippingAddress: Address;
  billingAddress: Address;
}

/**
 * Creates a new order from the customer's current cart. Returns the new
 * order's ID on success. Throws OrderServiceError with a user-safe
 * message if any cart line is no longer purchasable.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<string> {
  if (input.cartItems.length === 0) {
    throw new OrderServiceError('Your cart is empty.');
  }

  const lineItems = await buildLineItemsFromCart(input.cartItems);
  const currency = lineItems[0]?.unitPrice.currency ?? 'USD';

  const subtotal = sumMoney(
    lineItems.map((item) => item.lineTotal),
    currency,
  );

  const shippingCost: Money =
    subtotal.amountInMinorUnits >= FREE_SHIPPING_THRESHOLD_MINOR_UNITS
      ? { amountInMinorUnits: 0, currency }
      : FLAT_SHIPPING_COST;

  // Tax calculation is jurisdiction-specific (varies by shipping address)
  // and isn't wired to a tax service in this pass — represented honestly
  // as zero rather than an invented percentage.
  const tax: Money = { amountInMinorUnits: 0, currency };
  const discount: Money = { amountInMinorUnits: 0, currency }; // Promotions module not built yet.

  const total = sumMoney([subtotal, shippingCost, tax], currency);

  const newOrder: Omit<OrderDocument, 'orderId'> = {
    customerId: input.customerId,
    customerEmail: input.customerEmail,
    lineItems,
    shippingAddress: input.shippingAddress,
    billingAddress: input.billingAddress,
    subtotal,
    shippingCost,
    discount,
    tax,
    total,
    appliedPromoCode: null,
    status: 'pending_payment',
    statusHistory: [
      {
        status: 'pending_payment',
        changedAt: new Date().toISOString(),
        changedBy: input.customerId,
        note: 'Order placed by customer.',
      },
    ],
    paymentReference: null,
    trackingNumber: null,
    createdAt: serverTimestamp() as unknown as OrderDocument['createdAt'],
    updatedAt: serverTimestamp() as unknown as OrderDocument['updatedAt'],
  };

  const docRef = await addDoc(ordersCollection, newOrder as OrderDocument);
  return docRef.id;
}

/** Fetches every order placed by a given customer, most recent first —
 *  allowed by firestore.rules for the customer reading their own orders. */
export async function listOrdersForCustomer(customerId: string): Promise<OrderDocument[]> {
  const q = query(
    ordersCollection.withConverter(converter),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => docSnapshot.data());
}

/** Fetches every order, most recent first — staff+ only, per
 *  firestore.rules (the `read` rule allows staff+ to read all orders,
 *  vs. a customer who can only read their own). Used by the admin Orders
 *  page for fulfillment. */
export async function listAllOrders(): Promise<OrderDocument[]> {
  const q = query(ordersCollection.withConverter(converter), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => docSnapshot.data());
}

/**
 * Transitions an order to a new status, appending a StatusHistoryEntry
 * so the change is auditable (who changed it, when, and an optional
 * note — e.g. a tracking number). Allowed for staff+ by firestore.rules;
 * this function doesn't re-check the caller's role itself, matching the
 * pattern used throughout this service layer (see categories.service.ts
 * header comment for why that's intentional).
 *
 * Deducting sold stock from `inventory` when an order moves to 'paid' is
 * the natural next integration point once inventory allocation is
 * modeled (see inventory.service.ts's adjustStock, which already
 * supports a 'sale' reason and a relatedOrderId for exactly this) — not
 * wired up automatically here yet since it depends on the payment
 * integration this pass doesn't include (see this file's header note).
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderDocument['status'],
  actorId: string,
  note?: string,
): Promise<void> {
  const ref = doc(ordersCollection, orderId).withConverter(converter);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    throw new OrderServiceError('Order not found.');
  }
  const current = snapshot.data();

  await updateDoc(ref, {
    status: newStatus,
    statusHistory: [
      ...current.statusHistory,
      {
        status: newStatus,
        changedAt: new Date().toISOString(),
        changedBy: actorId,
        ...(note ? { note } : {}),
      },
    ],
    updatedAt: serverTimestamp(),
  });
}
