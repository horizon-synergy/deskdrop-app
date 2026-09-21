# DeskDrop — Online Stationery Store

DeskDrop is a first-party e-commerce application. DeskDrop sources
stationery from suppliers, holds it as its own stock, and sells it
directly to customers who order through the app — DeskDrop does not
design or manufacture the products, and this is **not** a marketplace
where outside sellers list their own inventory. Concretely: every
product in the `products` collection represents an item DeskDrop has
purchased from a supplier and stocked (tracked in `inventory`), not a
listing owned by someone else — which is why there's no seller/vendor
field anywhere in the schema and why `products`/`inventory` writes are
restricted to DeskDrop's own staff (manager+/staff+), never to an
external party.

## Status of this codebase

This repository is being built incrementally, in production-quality passes.
Each pass ships **real, working, fully-commented code** — nothing here is a
placeholder, a mock, or a "fill in later" stub.

### ✅ Latest pass — Neobrutalist redesign (restrained, not loud)

Full visual redesign of every screen. The brief was neobrutalism that
stays **calm, engaging and to the point** rather than the loud,
every-colour version the style is usually associated with — so the
system deliberately separates the two things people conflate:

- **Structure carries the brutalism.** Thick ink borders
  (`--border-strong`), solid offset shadows with **zero blur**
  (`--shadow-brutal*`), flat un-gradiented fills, heavy tight
  typography (800 weight, -0.03em tracking on display text).
- **Colour stays quiet.** Exactly ONE accent (`--color-accent`, a deep
  blue) used only for primary actions and live information like the cart
  badge. Every other hue is *semantic only* (success / danger / warning)
  and never decorative. The canvas is a warm off-white — pure white makes
  hard black borders feel clinical, and a saturated block background
  would compete with the accent.
- **Whitespace is unchanged** from the previous system. Density is what
  makes brutalism feel cluttered; the generous spacing scale is what
  keeps this version breathable.

**Signature interaction:** pressable elements translate *toward* their
shadow on `:active` while the shadow shrinks to zero, so they feel
physically pushed down; cards do the inverse on hover (lift up-left,
shadow grows). Fast and linear — easing curves read as too soft here.
`prefers-reduced-motion` disables it.

**How it was applied:** `src/styles/global.css` was rewritten as the
token layer, which re-themed most of the app for free since every module
already consumed `var(--...)` tokens (legacy `--shadow-sm`/`--shadow-md`
are aliased to the hard shadows so nothing was left soft). The most
visible surfaces were then rewritten by hand: buttons, inputs, header,
product cards, hero, auth screens, modal, admin sidebar and dashboard.
The six admin table pages were normalised programmatically.

Two things worth knowing if you extend this:
- **Reach for border + shadow first, accent last.** That ordering is the
  whole reason this reads as calm rather than shouty.
- **Recharts can't read CSS custom properties** (it renders SVG), so the
  chart colours in `AdminReportsPage`/`AdminAnalyticsPage` are literal
  hex values that must be kept in sync with the tokens by hand — they're
  commented as such at both call sites.

`Inter` is now loaded from Google Fonts in `index.html` at weights
400/600/700/800; the heavy weights matter because synthesised fake-bold
looks smeared at display sizes. It falls back to the system stack.

Verified as always: `tsc --noEmit`, `eslint .`, and `vite build` all
pass clean.

### ✅ Shipped earlier — Critical firestore.rules bug: role checks were denying everyone, including superadmin

Root-caused from a report of `permission-denied` on every write **despite
being signed in as `superadmin`** — which meant the earlier "role too
low / rules not deployed" advice couldn't be the (whole) explanation, so
the rules file itself needed re-auditing, not just re-deployment.

**The bug:** `callerHasMinimumRole()` computed role privilege with
`hierarchy.indexOf(callerRole())`, where `hierarchy` is a plain Rules
List. **`List` has no `.indexOf()` method in the Firestore Rules
language** — its method set is `concat`/`hasAll`/`hasAny`/`hasOnly`/
`join`/`removeAll`/`size`/`toSet`, and `indexOf` isn't one of them.
Calling it made the function's evaluation fail, and Firestore Rules
treats a failed evaluation as `false` — so `callerHasMinimumRole()` was
returning "no" for every role against every minimum, for every user,
regardless of their actual role. That's why a superadmin got denied on a
plain category save: the rule wasn't discriminating by role at all, it
was unconditionally broken.

**The fix:** replaced the list/indexOf approach with a map-based rank
lookup using `Map.get(key, default)`, which *is* a real, documented
Rules language method — see the updated `roleRank()`/
`callerHasMinimumRole()` functions in `firestore.rules`.

**This means anyone who deployed the previous version of this file was
running with role-based access effectively broken for every collection
that uses `callerHasMinimumRole()`** (`products`, `categories`,
`inventory`'s implicit staff+ check, `orders`, `promotions`, `settings`,
and the admin+ branch of the `users` update rule) — not a partial or
edge-case bug. **If you deployed the old rules, redeploy now:**

```bash
firebase deploy --only firestore:rules
```

or paste the updated `firestore.rules` into Firebase Console → Firestore
Database → Rules → Publish. This is exactly why real infrastructure
code — Firestore rules included — needs to be tested against a live
project and not just read-reviewed; a static read-through of this file
looked correct, and the bug only surfaces at rules-evaluation time.

### ✅ Shipped earlier — Firebase CLI deploy config + real error surfacing

Two issues reported from actually running the app against a live Firebase
project, both fixed:

- **`firestore.rules` had no way to actually reach Firestore.** The file
  existed in the repo, but there was no `firebase.json` or
  `firestore.indexes.json` wiring it up for `firebase deploy`, so it was
  never being applied — every write was hitting Firestore's own default
  ruleset instead, which is why category saves (and, as it turned out,
  even a brand-new user's own profile-creation write on first sign-in)
  were failing with `permission-denied`. Added both files; see
  "Deploying Firestore rules" below for the exact steps — **this is a
  required one-time setup step for anyone running this project**, not
  optional. `firebase.json`'s `hosting` block also adds the SPA rewrite
  this app needs if deployed to Firebase Hosting later, since it uses
  client-side routing (React Router) and would otherwise 404 on a direct
  load of any non-root URL.
- **Every admin form/page was swallowing the real Firestore error** and
  showing a generic "Could not save. Please try again." with nothing
  logged anywhere — which is exactly what made the rules-not-deployed
  issue above hard to diagnose in the first place. Added
  `src/lib/firebase/errors.ts` (`describeFirestoreError`), which always
  console.errors the real error and returns a specific, actionable
  message for `permission-denied` (the most common failure mode: role
  too low, or rules not deployed). Wired into every admin write/read
  path across the app.
- **The `Cross-Origin-Opener-Policy... window.closed` console warning
  during Google/GitHub sign-in is NOT a bug** — it's a known, cosmetic
  Firebase Auth SDK warning caused by Google's/GitHub's own OAuth popup
  page setting a strict COOP header, unrelated to this app's code or
  headers. Firebase has an internal fallback for it and sign-in
  completes normally despite the warning; nothing was changed for this
  because there is nothing in this codebase to fix. (If you want it gone
  entirely rather than just harmless, the real fix is switching those two
  providers from popup- to redirect-based sign-in — ask if you want that
  swap; it's a UX tradeoff, not a bug fix.)

### ✅ Shipped earlier — Admin navigation fix + business model clarification

Two real gaps caught by actually using the app, not just reading the code:

- **Admin navigation was broken.** Every admin page rendered as an
  isolated full-screen route with nothing linking them together — no
  way in except typing `/admin`, no way out except the browser back
  button. Fixed with `src/features/admin/components/AdminLayout.tsx`, a
  persistent sidebar (role-filtered links, active-page highlighting, an
  explicit "Back to store" link, and sign-out) that now wraps the entire
  `/admin/*` route tree in `AppRouter.tsx`. The public `Header` also
  gained a visible "Admin" link for staff+ users, so getting into the
  admin area doesn't require knowing the URL either.
- **Copy incorrectly implied DeskDrop designs/manufactures its products.**
  The actual model: DeskDrop sources stationery from suppliers, holds it
  as its own stock, and sells it directly — not a marketplace, but also
  not an in-house design/manufacturing operation. Fixed the homepage
  hero copy and this README's opening description. This was a wording
  fix only; the data model was already correct for it (a `product`
  document represents DeskDrop's own stocked item regardless of who
  supplied it — see `product.types.ts`). **Open item:** if you want
  supplier information tracked in the system itself (which supplier a
  product/restock came from, contact info, purchase cost vs. sale price),
  that's a real, separate data-model addition — a `suppliers` collection
  plus a `supplierId`/cost field on `inventory` — not yet built.

### ✅ Shipped earlier — the Identity & Access foundation

Everything else in the app (Shop, Orders, Inventory, Promotions, Analytics…)
reads the currently authenticated user and their role, so this had to be
built first, and built correctly:

- `src/lib/firebase/config.ts` — Firebase app bootstrap, read entirely from
  environment variables (no secrets in source).
- `src/types/*.ts` — Strongly-typed Firestore schema for every collection in
  the data model (`users`, `products`, `categories`, `orders`, `inventory`,
  `promotions`, `notifications`, `analytics`, `settings`).
- `src/lib/firebase/auth.service.ts` — Email/password, Google, and GitHub
  sign-in, registration, email verification, password reset, session
  persistence, logout.
- `src/lib/firebase/users.service.ts` — Creates/reads the Firestore `users/{uid}`
  document that stores the user's **role**. Roles are never trusted from the
  client at write time for anything security-sensitive — see
  `firestore.rules`.
- `src/store/authStore.ts` — Zustand store holding the live auth + profile
  state, fed by a single `onAuthStateChanged` subscription.
- `src/hooks/useAuth.ts`, `src/hooks/usePermission.ts` — App-facing hooks for
  consuming auth state and checking role permissions.
- `src/router/ProtectedRoute.tsx`, `src/router/AdminRoute.tsx` — Route guards.
  Non-admins hitting `/admin/*` are redirected immediately; unauthenticated
  users hitting authenticated routes are sent to `/login` with a return path.
- `src/router/AppRouter.tsx` — The full route table for the app (public,
  authenticated, admin), using the guards above. Feature pages that haven't
  been built yet are **not** routed with fake components — they're listed in
  the roadmap below instead of being faked.
- `firestore.rules` — Server-side enforcement of the same role model. This is
  the actual security boundary; the frontend guards are UX, not security.
- `src/features/auth/pages/*` — Login, Register, Forgot Password pages:
  real forms (React Hook Form + zod-style manual validation), real error
  handling, real Firestore/Auth calls.

### ✅ Shipped in this pass — Product & Category catalog management

Built on top of the foundation above:

- `src/lib/utils/slug.ts`, `src/lib/utils/money.ts` — small, shared,
  fully-tested-by-hand utilities (slug generation, decimal-string ⇄
  minor-units money conversion) reused by both the category and product forms.
- `src/lib/cloudinary/upload.service.ts` — unsigned Cloudinary uploads
  from the browser, with client-side file-type/size validation. See the
  file's header comment for the security reasoning behind using an
  unsigned preset here instead of holding Cloudinary's API secret.
- `src/lib/firebase/categories.service.ts`, `src/lib/firebase/products.service.ts`
  — typed Firestore CRUD for both collections, matching the read/write
  split enforced in `firestore.rules` (public reads, `manager`+ writes).
- `src/components/form/*` — FormField, TextAreaField, SelectField,
  ImageUploader — promoted out of the auth feature into a shared layer
  once a second feature (catalog management) needed the same primitives.
  `src/components/Modal.tsx` and `src/components/ConfirmDialog.tsx` are
  new shared, reusable UI primitives too.
- `src/router/RequireRole.tsx` — a more granular sibling to `AdminRoute`
  for admin sub-areas that need a role higher than plain `staff` (catalog
  management requires `manager`+, matching `firestore.rules` exactly).
- `src/features/admin/categories/*` — `/admin/categories`: full list,
  create, edit (modal form), and delete, with a referential-integrity
  guard that blocks deleting a category still assigned to products.
- `src/features/admin/products/*` — `/admin/products`,
  `/admin/products/new`, `/admin/products/:productId/edit`: filterable
  product list (status + search) and a full create/edit form supporting
  multiple images, multiple categories, tags, status, and a dynamic list
  of variants (SKU/price/attributes) via React Hook Form's `useFieldArray`.
  Archiving is preferred over hard-deletion for any product that could
  ever have been ordered — see `products.service.ts` for why.
- `firestore.rules` updated: no rule changes were needed — the
  `products`/`categories` rules were already scoped to `manager`+ writes
  in the previous pass, and this module's code was written to match them
  exactly (verified by running `tsc --noEmit` and `eslint` clean against
  the whole codebase).

### ✅ Shipped in this pass — Shop, Cart, Wishlist, Checkout & Orders

Built on top of the auth foundation and catalog-management passes:

- `src/store/cartStore.ts` — client-side cart (Zustand + localStorage
  persistence). Deliberately NOT a Firestore collection — see the file's
  header comment for why. Includes derived selectors
  (`useCartItems`, `useCartItemCount`, `useCartSubtotal`).
- `src/types/cart.types.ts` — the cart's line-item shape, explicitly
  documented as a stale/untrusted snapshot that checkout re-validates
  against live product data before ever creating an order.
- `wishlistProductIds` added to `UserDocument` (see `user.types.ts`) and
  `src/lib/firebase/wishlist.service.ts` — add/remove via Firestore's
  `arrayUnion`/`arrayRemove`. No `firestore.rules` changes were needed:
  the existing "a user may update their own document as long as role/
  isDisabled are unchanged" rule already covers it.
- `src/lib/firebase/orders.service.ts` — `placeOrder()` re-fetches
  authoritative current prices from `products` for every cart line
  (never trusts the client-side cart's cached prices), computes real
  totals, and creates a genuine `OrderDocument` with status
  `pending_payment`. **Honesty note, read the file's header comment**:
  payment processing itself isn't wired up — no processor was specified
  in the original stack, and faking a "Pay now" button that just marks
  an order `paid` client-side would be both dishonest and a security
  hole (which is exactly what `firestore.rules` prevents by only ever
  allowing customers to create orders in `pending_payment` status).
- `src/components/layout/Header.tsx` + `CartDrawer.tsx` — shared site
  header with a live cart badge and slide-over cart (view/adjust/remove),
  used across Home, Shop, Product Details, Wishlist, and Checkout.
- `/shop` and `/shop/:slug` (public) — live product grid with category
  filtering, and a full product detail page with variant selection,
  quantity, working "Add to cart", and a wishlist toggle.
- `/wishlist` (authenticated) — the signed-in user's saved products.
- `/checkout` (authenticated) — shipping address form + order review,
  calling `placeOrder()` for real.
- `/orders` (authenticated) — the signed-in user's own order history,
  scoped server-side to `customerId == request.auth.uid`.
- Verified with real tooling, not just read-through: `npm install`,
  `tsc --noEmit`, `eslint .`, and a full `vite build` all pass clean
  against the whole codebase as of this pass (two real type errors were
  caught and fixed along the way — see git history/diffs if you're
  tracking this in version control).

### ✅ Shipped in this pass — Inventory & Orders (admin/staff side)

Built on top of the Shop/Cart/Wishlist/Checkout/Orders pass:

- `src/lib/firebase/inventory.service.ts` — stock levels keyed
  `${productId}_${variantId}`, with every mutation going through
  `adjustStock()`, which updates counters AND appends an auditable
  `StockMovement` entry (see `inventory.types.ts`) — stock counts are
  never silently overwritten.
- `/admin/inventory` (staff+) — one row per product variant, joined
  against the `inventory` collection; a variant with no stock record yet
  shows "Initialize" rather than being hidden; a "Low stock only" filter
  and a modal for recording restocks/corrections/damage.
- `orders.service.ts` gained `listAllOrders()` and `updateOrderStatus()`
  (staff+, matching `firestore.rules`) — every status change appends to
  the order's `statusHistory` for auditability.
- `/admin/orders` (staff+) — fulfillment view: filter by status, move an
  order forward through a deliberately-restricted state machine (defined
  client-side in `AdminOrdersPage.tsx`; note this ordering isn't enforced
  by `firestore.rules` itself, which allows any staff+ write to `orders` —
  see that file's comment for why this is an application-layer, not
  security-layer, safeguard).
- Verified the same way as every pass: `npm install`, `tsc --noEmit`,
  `eslint .`, and `vite build` all pass clean.

### ✅ Shipped in this pass — Customers (admin directory + role/account management)

- `users.service.ts` gained `listAllUsers()`, and `setUserDisabled()`
  alongside the existing `updateUserRole()`.
- `/admin/customers` (manager+ to view, matching `firestore.rules`
  exactly) — searchable directory of every account. Role changes and
  disable/enable are further restricted to admin+ in the UI (a manager
  sees a read-only role badge instead of a dropdown), mirroring the
  *write* side of the same rule. A user can't demote/disable themselves
  from this screen.
- **Disabling an account is now actually enforced**, not just a UI badge:
  `authStore.ts`'s auth-state listener force-signs-out any session whose
  profile comes back `isDisabled: true`. The honest caveat is documented
  right there in the code — this is client-side enforcement (the session
  gets killed the moment the client notices), not a server-side block on
  the sign-in attempt itself; that would need a Cloud Function syncing
  this flag to Firebase Auth's own `disabled` property, which is outside
  this client-only pass.
- Verified the same way as every pass: `npm install`, `tsc --noEmit`,
  `eslint .`, and `vite build` all pass clean.

### ✅ Shipped in this pass — Promotions, Reports, Analytics, Settings

The last four admin modules from the original spec:

- `promotions.service.ts` + `/admin/promotions` (manager+) — full CRUD
  over discount codes, with the same "can't delete something already
  redeemed" integrity guard used for categories. `getPromotionByCode()`
  is ready for Checkout to call once promo-code entry is added there
  (currently Checkout doesn't collect a code — see Checkout's own
  remaining gaps below).
- `/admin/reports` (admin+) — **read this one's header comment.** There's
  no scheduled backend job in this pass, so rather than leave Reports
  empty, it computes real revenue/order-count/average-order-value/top
  -products aggregates live from the actual `orders` collection each time
  the page loads. Genuinely accurate, just computed at view time instead
  of precomputed nightly.
- `/admin/analytics` (admin+) — reads the real (and, on a fresh deploy,
  genuinely empty) `analytics` collection. Rather than fake a chart, it
  explains plainly that this collection is meant to be written by a
  scheduled Cloud Function this pass doesn't include, and points to
  Reports for revenue numbers that work today. The moment that function
  exists and starts writing `analytics/{date}` docs, this same page
  renders the real trend — no code changes needed.
- `settings.service.ts` + `/admin/settings` (admin+) — the `settings/store`
  singleton document (store name, support email, currency, a storefront
  -open toggle). Seeded with defaults via an admin-only call, never from
  a public read path (an earlier draft of this file made that mistake —
  fixed before shipping, see the function's comment for why it matters).
- Verified the same way as every pass: `npm install`, `tsc --noEmit`,
  `eslint .`, and `vite build` all pass clean.

## Every route and module from the original spec is now built

Public: Home, Shop, Product Details, Login, Register, Forgot Password.
Authenticated: Orders, Wishlist, Profile, Checkout. Admin: Dashboard,
Products, Categories, Inventory, Orders, Customers, Promotions, Reports,
Analytics, Settings.

### What's still genuinely open (documented, not hidden)

- **No payment processor is integrated.** None was specified in the
  original stack, and this is a deliberate, consequential choice (Stripe
  vs. a regional processor vs. something else) that shouldn't be made
  silently on someone's behalf. Orders are created correctly at
  `pending_payment` and everything downstream (fulfillment, status
  history) works — the "customer actually pays" step is the one piece
  intentionally left for whoever makes that call.
- **No scheduled Cloud Functions.** Analytics rollups and (as noted in
  `orders.service.ts`) automatic inventory deduction on payment both have
  their client-side halves ready and are waiting on backend jobs this
  client-only pass doesn't include.
- **Account disabling is client-enforced, not server-enforced** (see
  `authStore.ts`) — a Cloud Function syncing `isDisabled` to Firebase
  Auth's own `disabled` flag would close that gap.
- **Checkout collects one address**, reused for billing; a genuinely
  separate billing address form is a straightforward follow-up.
- **Promo codes aren't wired into Checkout yet** — the service function
  exists (`getPromotionByCode`) but the checkout form doesn't have a
  "have a code?" field calling it.

None of the above are placeholders or mocks — they're real integration
points that depend on decisions (which payment processor, whether/how to
deploy Cloud Functions) that go beyond what a frontend build can decide
unilaterally.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Firebase + Cloudinary credentials
npm run dev
```

## Deploying Firestore rules (REQUIRED — do this before using the app)

`firestore.rules` in this repo is not automatically applied to your
Firebase project just by existing in the codebase. Firestore ships with
its own default ruleset until you explicitly deploy this file, and that
default is what's producing `permission-denied` on essentially every
write (creating your own user profile on first sign-in, saving a
category, anything) until this step is done:

```bash
npm install -g firebase-tools   # one-time, if you don't have it
firebase login
firebase use --add              # pick your Firebase project; writes .firebaserc
firebase deploy --only firestore:rules,firestore:indexes
```

`firebase.json` and `firestore.indexes.json` (both included in this repo)
are what make that last command work — without them, `firebase deploy`
has nothing telling it where `firestore.rules` lives or maps to.

You can verify it worked in **Firebase Console → Firestore Database →
Rules** — the content shown there should match `firestore.rules` in this
repo, with a recent "last deployed" timestamp.

If you'd rather not use the CLI, you can instead paste the contents of
`firestore.rules` directly into that same Rules tab in the console and
click **Publish** — functionally identical to the CLI deploy for rules
specifically (the CLI is only strictly needed for `firestore.indexes.json`
and for `firebase deploy --only hosting`, if you deploy this app to
Firebase Hosting later — `firebase.json`'s `hosting` block includes the
SPA rewrite this app needs, since it uses client-side routing and would
otherwise 404 on a direct load of any non-root URL).

## Environment variables

See `.env.example`. All Firebase web config values are safe to expose to the
client (they identify the project, they don't authorize anything by
themselves) — but they still live in `.env.local`, which is git-ignored, so
that per-environment (dev/staging/prod) project configs never get committed
or mixed up. Actual authorization is enforced by Firestore Security Rules
and custom claims, not by the presence/absence of these values.

## Architecture

- **Feature-based folders**: `src/features/<feature>/{pages,components,hooks,services}`.
  Each feature owns its own UI and Firestore access logic.
- **`src/lib/firebase`**: the only place the Firebase SDK is imported
  directly. Every other file talks to Firebase through this layer. This
  keeps the SDK swappable and makes security review tractable — there's one
  place to audit for every read/write.
- **Strict TypeScript**: `strict: true`, no `any` in domain code, every
  Firestore document has a matching interface with a `converter` so reads
  come back typed instead of `DocumentData`.
- **CSS Modules only**: no Tailwind/Bootstrap/MUI. Each component's styles
  live in a colocated `Component.module.css`.
