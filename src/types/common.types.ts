/**
 * common.types.ts
 * ----------------------------------------------------------------------------
 * Small, widely-shared types that don't belong to any single Firestore
 * collection. Kept separate so feature-specific type files
 * (product.types.ts, order.types.ts, ...) can import from here without
 * circular dependencies.
 */

import type { Timestamp } from 'firebase/firestore';

/**
 * Every document in this app stores its timestamps as native Firestore
 * `Timestamp` objects (not JS `Date` and not numbers). Storing native
 * Timestamps lets us use Firestore server-side time (`serverTimestamp()`)
 * for `createdAt`, which avoids relying on a client's possibly-wrong clock,
 * and lets Firestore Security Rules compare/validate them natively.
 */
export interface AuditFields {
  /** Set once, on creation, using serverTimestamp(). Never modified after. */
  createdAt: Timestamp;
  /** Updated on every write using serverTimestamp(). */
  updatedAt: Timestamp;
}

/**
 * A money amount. We store prices as integer minor units (cents) rather
 * than floats, which is the standard way to avoid floating-point rounding
 * bugs in financial calculations (e.g. 19.99 + 5.01 in float math can drift).
 * `currency` is an ISO 4217 code so the store can expand beyond a single
 * currency later without a schema migration.
 */
export interface Money {
  /** Amount in the smallest unit of the currency, e.g. cents for USD/ZAR. */
  amountInMinorUnits: number;
  /** ISO 4217 currency code, e.g. "USD", "ZAR". */
  currency: string;
}

/**
 * A physical postal address. Used for both order shipping addresses and
 * (later) saved addresses on a customer's profile.
 */
export interface Address {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string; // state / province
  postalCode: string;
  country: string; // ISO 3166-1 alpha-2, e.g. "ZA", "US"
  phone: string;
}

/**
 * Generic paginated-list result shape returned by list-style Firestore
 * queries in our service layer, so UI components don't need to know
 * anything about Firestore's `QueryDocumentSnapshot` cursor API directly.
 */
export interface Page<T> {
  items: T[];
  /** Opaque cursor to pass back in to fetch the next page, or null if this is the last page. */
  nextCursor: unknown | null;
}
