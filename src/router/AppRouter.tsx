/**
 * AppRouter.tsx
 * ----------------------------------------------------------------------------
 * The single route table for the app. Three tiers, matching the spec:
 *
 *   PUBLIC          — no guard. Anyone can view.
 *   PROTECTED       — wrapped in <ProtectedRoute> (any signed-in user).
 *   ADMIN           — wrapped in <AdminRoute> (signed-in AND role in
 *                      ADMIN_ROLES). AdminRoute internally also requires
 *                      authentication, so it doesn't need to be nested
 *                      inside ProtectedRoute as well.
 *
 * React Router's nested-route pattern is used for the guards: a guard
 * component renders <Outlet /> when access is allowed, or a <Navigate />
 * redirect when it isn't — so every child route under it automatically
 * inherits the same check without repeating guard logic per-page.
 *
 * Routes for features not yet built (Shop, Product Details, Orders,
 * Wishlist, Checkout, and the Inventory/Customers/Promotions/Reports/
 * Analytics/Settings admin modules) are intentionally omitted rather than
 * pointed at placeholder components — see README.md's roadmap section.
 * Visiting an unbuilt path today correctly falls through to the 404 page.
 * Products and Categories (this pass's catalog-management module) ARE
 * fully built and routed below, gated to manager+ via <RequireRole>.
 */

import type { ReactElement } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
import { RequireRole } from './RequireRole';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { HomePage } from '@/features/home/pages/HomePage';
import { NotFoundPage } from '@/features/home/pages/NotFoundPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { ShopPage } from '@/features/shop/pages/ShopPage';
import { ProductDetailsPage } from '@/features/shop/pages/ProductDetailsPage';
import { WishlistPage } from '@/features/wishlist/pages/WishlistPage';
import { CheckoutPage } from '@/features/checkout/pages/CheckoutPage';
import { OrdersPage } from '@/features/orders/pages/OrdersPage';
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage';
import { AdminCategoriesPage } from '@/features/admin/categories/pages/AdminCategoriesPage';
import { AdminProductsPage } from '@/features/admin/products/pages/AdminProductsPage';
import { AdminProductFormPage } from '@/features/admin/products/pages/AdminProductFormPage';
import { AdminInventoryPage } from '@/features/admin/inventory/pages/AdminInventoryPage';
import { AdminOrdersPage } from '@/features/admin/orders/pages/AdminOrdersPage';
import { AdminCustomersPage } from '@/features/admin/customers/pages/AdminCustomersPage';
import { AdminPromotionsPage } from '@/features/admin/promotions/pages/AdminPromotionsPage';
import { AdminReportsPage } from '@/features/admin/reports/pages/AdminReportsPage';
import { AdminAnalyticsPage } from '@/features/admin/analytics/pages/AdminAnalyticsPage';
import { AdminSettingsPage } from '@/features/admin/settings/pages/AdminSettingsPage';

export function AppRouter(): ReactElement {
  return (
    <Routes>
      {/* ---------------------------------------------------------------- *
       * PUBLIC ROUTES
       * ---------------------------------------------------------------- */}
      <Route path="/" element={<HomePage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/shop/:slug" element={<ProductDetailsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* ---------------------------------------------------------------- *
       * AUTHENTICATED ROUTES — require any signed-in user.
       * ---------------------------------------------------------------- */}
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Route>

      {/* ---------------------------------------------------------------- *
       * ADMIN ROUTES — require role in ADMIN_ROLES (staff and above).
       * ---------------------------------------------------------------- */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />

          {/* Inventory and Orders are staff+ (the same minimum as the admin
              area itself), matching firestore.rules exactly — no
              additional <RequireRole> tier is needed for these two. */}
          <Route path="/admin/inventory" element={<AdminInventoryPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />

          {/* Catalog management needs manager+ specifically — see
              firestore.rules, which enforces the identical minimum
              server-side for writes to `products` and `categories`. */}
          <Route element={<RequireRole minimumRole="manager" />}>
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/products/new" element={<AdminProductFormPage />} />
            <Route path="/admin/products/:productId/edit" element={<AdminProductFormPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/promotions" element={<AdminPromotionsPage />} />
          </Route>

          {/* Reports, Analytics, and Settings need admin+ specifically —
              see firestore.rules, which enforces the identical minimum
              server-side for reads of `analytics` and writes to `settings`. */}
          <Route element={<RequireRole minimumRole="admin" />}>
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
