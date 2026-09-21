/**
 * promotion.types.ts
 * ----------------------------------------------------------------------------
 * Types for the `promotions` collection — discount codes and automatic
 * campaigns. Kept as a distinct collection (rather than embedded in
 * settings) because promotions have their own lifecycle (draft -> active
 * -> expired) and are queried at checkout by `code`, which needs its own
 * indexed field.
 */

import type { AuditFields } from './common.types';

export type PromotionDiscountType = 'percentage' | 'fixed_amount';

export interface PromotionDocument extends AuditFields {
  promotionId: string;
  /** Customer-facing code, always stored upper-cased for case-insensitive lookup. */
  code: string;
  description: string;
  discountType: PromotionDiscountType;
  /** Percentage as a whole number (10 = 10%) or minor-unit fixed amount,
   *  interpreted according to discountType. */
  discountValue: number;
  /** Minimum order subtotal (in minor units) required to apply this promo, or null for none. */
  minimumSubtotal: number | null;
  /** ISO 8601 date strings bounding the promotion's validity window. */
  startsAt: string;
  endsAt: string;
  /** Total redemptions allowed across all customers, or null for unlimited. */
  usageLimit: number | null;
  /** Incremented atomically each time the promo is successfully applied to an order. */
  timesUsed: number;
  isActive: boolean;
}
