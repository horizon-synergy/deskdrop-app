/**
 * WishlistPage.tsx
 * ----------------------------------------------------------------------------
 * Authenticated route: /wishlist
 *
 * Reads the current user's `wishlistProductIds` (via useWishlist, backed
 * by the live profile in authStore) and fetches each corresponding
 * product from Firestore to render as a grid. Products that were removed
 * or archived since being wishlisted are silently skipped rather than
 * shown broken — the wishlist ID stays on the user's document either way
 * (no destructive cleanup happens just from viewing this page).
 */

import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { FullPageLoader } from '@/components/FullPageLoader';
import { ProductCard } from '../../shop/components/ProductCard';
import { useWishlist } from '@/hooks/useWishlist';
import { getProduct } from '@/lib/firebase/products.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import type { ProductDocument } from '@/types/product.types';
import styles from './WishlistPage.module.css';

export function WishlistPage(): ReactElement {
  const { productIds } = useWishlist();
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWishlistedProducts(): Promise<void> {
      setIsLoading(true);
      setLoadError(null);
      try {
        const results = await Promise.all(productIds.map((id) => getProduct(id)));
        setProducts(results.filter((product): product is ProductDocument => product !== null && product.status === 'active'));
      } catch (error) {
        setLoadError(describeFirestoreError(error, 'Could not load your wishlist. Please refresh the page.'));
      } finally {
        setIsLoading(false);
      }
    }
    void loadWishlistedProducts();
  }, [productIds]);

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.content}>
        <h1 className={styles.title}>Your wishlist</h1>

        {isLoading ? (
          <FullPageLoader label="Loading your wishlist…" />
        ) : loadError ? (
          <p className={styles.errorText}>{loadError}</p>
        ) : products.length === 0 ? (
          <p className={styles.emptyState}>
            Nothing saved yet. Browse the{' '}
            <Link to="/shop" className={styles.link}>
              shop
            </Link>{' '}
            and tap the heart on anything you love.
          </p>
        ) : (
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
