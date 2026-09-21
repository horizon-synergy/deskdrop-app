/**
 * ProtectedRoute.tsx
 * ----------------------------------------------------------------------------
 * Wraps routes that require *any* signed-in user (Orders, Wishlist,
 * Profile, Checkout). Renders nothing but a loading state until Firebase
 * has told us definitively whether a session exists — without this wait,
 * a signed-in user with a persisted session would flash-redirect to
 * /login on every full page load while Firebase restores their session
 * asynchronously.
 *
 * Unauthenticated users are redirected to /login with the page they were
 * trying to reach preserved in navigation state, so LoginPage can send
 * them back to it after a successful sign-in.
 */

import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullPageLoader } from '@/components/FullPageLoader';

export function ProtectedRoute(): ReactElement {
  const { isReady, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <FullPageLoader label="Checking your session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Outlet renders whichever child route matched — this component is used
  // as a layout route in AppRouter.tsx, wrapping every authenticated page.
  return <Outlet />;
}
