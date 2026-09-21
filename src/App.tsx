/**
 * App.tsx
 * ----------------------------------------------------------------------------
 * Application root. Two responsibilities only:
 *   1. Start the Firebase auth listener exactly once for the lifetime of
 *      the app (via authStore.initAuthListener), and clean it up on
 *      unmount.
 *   2. Provide the router context (<BrowserRouter>) and render the route
 *      table (<AppRouter>).
 *
 * Deliberately thin — page-level and feature-level concerns live in
 * src/features/*, not here.
 */

import { useEffect, type ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from '@/router/AppRouter';
import { useAuthStore } from '@/store/authStore';

export function App(): ReactElement {
  const initAuthListener = useAuthStore((s) => s.initAuthListener);

  useEffect(() => {
    // Starts the onAuthStateChanged subscription described in
    // authStore.ts. The returned function unsubscribes it — returning it
    // directly as the effect's cleanup means the listener is torn down
    // correctly if <App> ever unmounts (e.g. in tests).
    const unsubscribe = initAuthListener();
    return unsubscribe;
  }, [initAuthListener]);

  return (
    // Opting into React Router's v7 future flags now: v7_startTransition
    // wraps route-driven state updates in React.startTransition, and
    // v7_relativeSplatPath changes how relative paths resolve inside
    // splat (`*`) routes. Neither changes this app's behavior today —
    // this app doesn't use splat routes for nested relative links — but
    // opting in now means the eventual v7 upgrade is a non-event instead
    // of a breaking change, and it silences the console warnings both
    // flags otherwise print on every route change in v6.
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRouter />
    </BrowserRouter>
  );
}
