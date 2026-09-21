/**
 * productFormTypes.ts
 * ----------------------------------------------------------------------------
 * The product form works with a "form-friendly" shape (VariantFormRow)
 * that's easier to bind to text inputs than the storage shape
 * (ProductVariant) — prices are decimal strings instead of minor-unit
 * integers, and attributes are a single comma-separated text field
 * instead of a Record. This file defines that form shape and the two
 * conversion functions between it and the real ProductVariant/NewProductInput
 * types, keeping that parsing logic out of the component itself.
 */

import { parseMoneyInput, formatMoneyInput } from '@/lib/utils/money';
import type { ProductVariant } from '@/types/product.types';

export interface VariantFormRow {
  /** Present when editing an existing variant; undefined for a new row
   *  appended in this form session (see formRowToVariant). */
  variantId?: string;
  label: string;
  sku: string;
  /** Decimal string, e.g. "24.99" — see lib/utils/money.ts. */
  priceInput: string;
  /** Comma-separated key:value pairs, e.g. "size:A5, color:Navy". */
  attributesText: string;
}

export interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  categoryIds: string[];
  tagsText: string;
  status: 'draft' | 'active' | 'archived';
  variants: VariantFormRow[];
}

/** Parses "size:A5, ruling:Ruled, color:Navy" into { size: "A5", ruling: "Ruled", color: "Navy" }. */
function parseAttributesText(text: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  text
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [key, ...rest] = pair.split(':');
      if (key && rest.length > 0) {
        attributes[key.trim()] = rest.join(':').trim();
      }
    });
  return attributes;
}

function formatAttributesText(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
}

/** Converts a stored ProductVariant into the decimal/text form shape,
 *  used to populate the edit form for an existing product. `variantId`
 *  isn't part of the form row — it's preserved separately by the caller
 *  (AdminProductFormPage) so an edit doesn't accidentally mint new IDs
 *  for unchanged variants. */
export function variantToFormRow(variant: ProductVariant): VariantFormRow {
  return {
    variantId: variant.variantId,
    label: variant.label,
    sku: variant.sku,
    priceInput: formatMoneyInput(variant.price),
    attributesText: formatAttributesText(variant.attributes),
  };
}

/** Converts a form row back into a storage-shaped ProductVariant. Reuses
 *  `row.variantId` when the row corresponds to a variant that already
 *  existed (preserving its identity across edits, which matters since
 *  inventory documents are keyed off `${productId}_${variantId}`), and
 *  mints a fresh UUID for brand-new rows added in this form session. */
export function formRowToVariant(row: VariantFormRow): ProductVariant {
  const price = parseMoneyInput(row.priceInput);
  if (!price) {
    throw new Error(`Invalid price for variant "${row.label}".`);
  }
  return {
    variantId: row.variantId ?? crypto.randomUUID(),
    label: row.label.trim(),
    sku: row.sku.trim(),
    price,
    attributes: parseAttributesText(row.attributesText),
  };
}
