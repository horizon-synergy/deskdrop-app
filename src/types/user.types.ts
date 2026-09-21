/**
 * user.types.ts
 * ----------------------------------------------------------------------------
 * Types for the `users/{uid}` Firestore collection and the role-based access
 * control (RBAC) model built on top of it.
 *
 * SECURITY NOTE — read this before touching roles anywhere in the app:
 * The `role` field on a user document is the single source of truth for
 * what that user is allowed to do. It is:
 *   1. Set to "customer" automatically on first sign-in (see
 *      users.service.ts -> ensureUserDocument), and can only be escalated
 *      by a call made through Firestore rules that check the *acting*
 *      user's own role (see firestore.rules — a user can never set their
 *      own `role` field; only an existing admin/superadmin can change
 *      someone else's role).
 *   2. Re-validated on the server by Firestore Security Rules on every
 *      write to a protected collection (products, orders, inventory, ...).
 *      The frontend route guards (AdminRoute etc.) exist purely for UX —
 *      they stop a non-admin from *seeing* an admin screen, but they are
 *      never the thing standing between a malicious client and the data.
 */

import type { Timestamp } from 'firebase/firestore';
import type { AuditFields, Address } from './common.types';

/**
 * The five roles supported by DeskDrop, ordered from least to most
 * privileged. Stored as a plain string union (not a TS enum) because
 * string unions serialize to/from Firestore and JSON without any extra
 * mapping code.
 */
export type UserRole = 'customer' | 'staff' | 'manager' | 'admin' | 'superadmin';

/**
 * Ordered privilege ranking used by `usePermission` / `hasMinimumRole` to
 * answer "is this role at least as privileged as that role?" without
 * hard-coding comparisons all over the app. Index position = privilege
 * level (higher index = more privilege).
 */
export const ROLE_HIERARCHY: readonly UserRole[] = [
  'customer',
  'staff',
  'manager',
  'admin',
  'superadmin',
] as const;

/** Any role other than "customer" is allowed into the /admin/* route tree. */
export const ADMIN_ROLES: readonly UserRole[] = ['staff', 'manager', 'admin', 'superadmin'];

/**
 * Shape of a document in the `users` collection, keyed by Firebase Auth
 * `uid`. This is the app's "profile" record — Firebase Auth itself only
 * stores identity (email, provider, verification status), not app-level
 * data like role or shipping addresses.
 */
export interface UserDocument extends AuditFields {
  /** Firebase Auth UID. Duplicated into the document body (not just the doc ID)
   *  so it's available after a collection-group query or when the doc is
   *  spread into a flat object in the UI layer. */
  uid: string;

  email: string;

  /** Denormalized from Firebase Auth so Firestore rules and admin lists
   *  can check verification status without a second Auth lookup. Kept in
   *  sync by the client immediately after `sendEmailVerification` succeeds
   *  and by re-reading `user.emailVerified` on each auth state change. */
  emailVerified: boolean;

  displayName: string;

  /** Nullable — Cloudinary secure_url of the user's avatar, or null if unset. */
  photoURL: string | null;

  /**
   * How this account authenticates. A user can have signed up with email,
   * then never linked Google/GitHub — this simply reflects the provider(s)
   * currently linked to the Firebase Auth account.
   */
  authProviders: Array<'password' | 'google.com' | 'github.com'>;

  role: UserRole;

  /** Soft-disable flag. A disabled account keeps its data (order history,
   *  etc.) but is blocked from signing in — enforced both in the app and
   *  by Firestore rules, and mirrored to Firebase Auth's `disabled` flag
   *  by an admin action so token-level sign-in is also blocked. */
  isDisabled: boolean;

  /** Optional saved shipping addresses, most-recently-used first. */
  savedAddresses: Address[];

  /** Product IDs the user has saved to their wishlist. Modeled as a plain
   *  array on the user document (rather than a subcollection) since
   *  wishlists are small (bounded by realistic UI/UX limits) and this
   *  keeps reads to a single document fetch — see wishlist.service.ts. */
  wishlistProductIds: string[];

  /** Timestamp of the user's most recent successful sign-in, refreshed on
   *  each session start. Useful for admin "last active" columns. */
  lastLoginAt: Timestamp | null;
}

/**
 * Fields the client is allowed to set when it first creates its own user
 * document (see users.service.ts -> ensureUserDocument). Deliberately a
 * *subset* of UserDocument: role, isDisabled, and audit fields are never
 * client-writable on create — role defaults server-side-equivalent to
 * "customer" via Firestore rules, isDisabled defaults to false, and the
 * audit timestamps are stamped with serverTimestamp().
 */
export type NewUserInput = Pick<
  UserDocument,
  'uid' | 'email' | 'emailVerified' | 'displayName' | 'photoURL' | 'authProviders'
>;
