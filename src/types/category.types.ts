/**
 * category.types.ts
 * ----------------------------------------------------------------------------
 * Types for the `categories` collection. Categories form a shallow tree
 * (top-level categories + optional single-level subcategories) via
 * `parentCategoryId`, which is enough for a stationery store's catalog
 * (e.g. "Writing" -> "Pens", "Writing" -> "Pencils") without the
 * complexity of arbitrary-depth nesting.
 */

import type { AuditFields } from './common.types';

export interface CategoryDocument extends AuditFields {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  /** Cloudinary secure_url for the category tile image shown on the shop landing page. */
  imageUrl: string | null;
  /** null for a top-level category, otherwise the categoryId of its parent. */
  parentCategoryId: string | null;
  /** Manual sort order for display (lower shows first). */
  displayOrder: number;
  /** Whether this category is currently shown in navigation/shop pages. */
  isVisible: boolean;
}

export type NewCategoryInput = Pick<
  CategoryDocument,
  'name' | 'slug' | 'description' | 'imageUrl' | 'parentCategoryId' | 'displayOrder' | 'isVisible'
>;
