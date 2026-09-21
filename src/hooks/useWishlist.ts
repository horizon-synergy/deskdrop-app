/**
 * useWishlist.ts
 * ----------------------------------------------------------------------------
 * App-facing hook for wishlist state, mirroring the useAuth/usePermission
 * pattern. Reads `wishlistProductIds` from the live profile in
 * authStore, and after any mutation calls `refreshProfile()` so the UI
 * (e.g. a filled/outlined heart icon on a product card) updates
 * immediately without waiting for the next full auth-state refresh.
 */

import { useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { addToWishlist, removeFromWishlist } from '@/lib/firebase/wishlist.service';

export interface UseWishlistResult {
  productIds: string[];
  isInWishlist: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
}

export function useWishlist(): UseWishlistResult {
  const uid = useAuthStore((s) => s.firebaseUser?.uid ?? null);
  const productIds = useAuthStore((s) => s.profile?.wishlistProductIds ?? []);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const isInWishlist = useCallback((productId: string) => productIds.includes(productId), [productIds]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!uid) return; // Callers gate the UI behind isAuthenticated; this is a safety net.
      if (productIds.includes(productId)) {
        await removeFromWishlist(uid, productId);
      } else {
        await addToWishlist(uid, productId);
      }
      await refreshProfile();
    },
    [uid, productIds, refreshProfile],
  );

  return { productIds, isInWishlist, toggle };
}
