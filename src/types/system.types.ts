/**
 * system.types.ts
 * ----------------------------------------------------------------------------
 * Types for the smaller, more "operational" collections: `notifications`,
 * `analytics`, and `settings`. Grouped in one file since each is a simple,
 * single-purpose shape rather than a rich entity like Product or Order.
 */

import type { AuditFields } from './common.types';

/* ---------------------------------------------------------------------- *
 * notifications — one doc per notification, per recipient.
 * ---------------------------------------------------------------------- */

export type NotificationType =
  | 'order_status_changed'
  | 'low_stock_alert'
  | 'promotion_started'
  | 'account_role_changed';

export interface NotificationDocument extends AuditFields {
  notificationId: string;
  /** uid of the recipient. Admin-facing notifications (e.g. low_stock_alert)
   *  are fanned out to every staff+ user at creation time. */
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Deep link within the app the notification should navigate to when clicked. */
  linkTo: string | null;
  isRead: boolean;
}

/* ---------------------------------------------------------------------- *
 * analytics — precomputed daily rollups, written by a scheduled Cloud
 * Function (not by clients) so the admin dashboard can render charts by
 * reading a handful of small documents instead of aggregating the full
 * orders collection on every page load.
 * ---------------------------------------------------------------------- */

export interface DailySalesSummaryDocument {
  /** Document ID is the date itself, formatted YYYY-MM-DD, for cheap range queries. */
  date: string;
  ordersCount: number;
  /** Revenue in minor units, single currency (see Money type notes). */
  revenueInMinorUnits: number;
  unitsSold: number;
  newCustomers: number;
}

/* ---------------------------------------------------------------------- *
 * settings — a small number of singleton documents (e.g. settings/store,
 * settings/shipping) holding store-wide configuration editable by admins.
 * ---------------------------------------------------------------------- */

export interface StoreSettingsDocument extends AuditFields {
  storeName: string;
  supportEmail: string;
  /** Default currency for new orders (ISO 4217). */
  defaultCurrency: string;
  /** Whether the storefront is accepting new orders; toggled during
   *  maintenance windows or stock-taking. */
  isStorefrontOpen: boolean;
}
