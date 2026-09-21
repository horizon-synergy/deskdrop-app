/**
 * product.types.ts
 * ----------------------------------------------------------------------------
 * Types for the `products` collection — DeskDrop's owned catalog. Since
 * DeskDrop sells its own inventory (not third-party listings), a product
 * and its stock are two separate concerns modeled as two collections:
 *   - `products`   — catalog/display data (name, price, images, category)
 *   - `inventory`  — stock levels per product/variant (see inventory.types.ts)
 * Splitting them means a stock-count change (which can happen very
 * frequently, e.g. on every order) doesn't rewrite catalog data, and lets
 * us apply tighter write rules to inventory (staff/manager+) than to the
 * catalog metadata (manager/admin can edit).
 */

import type { AuditFields, Money } from './common.types';

/** A single purchasable variation of a product, e.g. "A5 / Ruled / Blue". */
export interface ProductVariant {
  /** Stable ID for this variant, referenced by inventory docs and order line items. */
  variantId: string;
  /** Human-readable label shown in the UI, e.g. "A5 · Ruled · Navy". */
  label: string;
  /** Distinguishing attributes, e.g. { size: "A5", ruling: "Ruled", color: "Navy" }. */
  attributes: Record<string, string>;
  /** SKU used for inventory reconciliation and order records. */
  sku: string;
  /** Price for this specific variant (variants can be priced independently,
   *  e.g. a larger notebook size costs more). */
  price: Money;
}

export type ProductStatus = 'draft' | 'active' | 'archived';

/**
 * Shape of a document in the `products` collection.
 */
export interface ProductDocument extends AuditFields {
  productId: string;
  name: string;
  /** URL-safe, unique, human-readable identifier used in the product page route. */
  slug: string;
  description: string;
  /** IDs referencing `categories` documents. A product can belong to more
   *  than one category (e.g. "Notebooks" and "New Arrivals"). */
  categoryIds: string[];
  /** Cloudinary secure_urls, first image is the primary/thumbnail image. */
  imageUrls: string[];
  variants: ProductVariant[];
  /** Free-text tags used for search/filtering, e.g. ["eco-friendly", "gift"]. */
  tags: string[];
  status: ProductStatus;
  /** Average of published review ratings, denormalized for fast list-page
   *  rendering without a fan-out query. Recomputed whenever a review is
   *  added/edited (server-side, via Cloud Function — not shown in this pass). */
  averageRating: number;
  reviewCount: number;
  /** Total units sold, denormalized for admin sorting ("best sellers"). */
  unitsSold: number;
}

/** Fields required to create a new product from the admin UI. */
export type NewProductInput = Pick<
  ProductDocument,
  'name' | 'slug' | 'description' | 'categoryIds' | 'imageUrls' | 'variants' | 'tags' | 'status'
>;
