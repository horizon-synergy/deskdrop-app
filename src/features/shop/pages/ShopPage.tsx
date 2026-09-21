/**
 * ShopPage.tsx
 * ----------------------------------------------------------------------------
 * Public route: /shop
 *
 * Browses the live catalog: only products with status 'active' (the
 * public read path — see products.service.ts / firestore.rules, where
 * catalog reads are open to everyone but this page specifically chooses
 * to only ever request active products, never draft/archived). Category
 * filtering reads from the `categories` collection and re-queries
 * products by categoryId when a filter is selected.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { Header } from '@/components/layout/Header';
import { FullPageLoader } from '@/components/FullPageLoader';
import { ProductCard } from '../components/ProductCard';
import { listProducts } from '@/lib/firebase/products.service';
import { listCategories } from '@/lib/firebase/categories.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import type { ProductDocument } from '@/types/product.types';
import type { CategoryDocument } from '@/types/category.types';
import styles from './ShopPage.module.css';

export function ShopPage(): ReactElement {
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [categories, setCategories] = useState<CategoryDocument[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories(): Promise<void> {
      try {
        const results = await listCategories();
        setCategories(results.filter((category) => category.isVisible));
      } catch {
        // Category filter sidebar is a progressive enhancement — if it
        // fails to load, the product grid below still works unfiltered.
      }
    }
    void loadCategories();
  }, []);

  useEffect(() => {
    async function loadProducts(): Promise<void> {
      setIsLoading(true);
      setLoadError(null);
      try {
        const results = await listProducts({
          status: 'active',
          ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
        });
        setProducts(results);
      } catch (error) {
        setLoadError(describeFirestoreError(error, 'Could not load products. Please refresh the page.'));
      } finally {
        setIsLoading(false);
      }
    }
    void loadProducts();
  }, [selectedCategoryId]);

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Categories</h2>
          <button
            type="button"
            className={selectedCategoryId === null ? styles.categoryButtonActive : styles.categoryButton}
            onClick={() => setSelectedCategoryId(null)}
          >
            All products
          </button>
          {categories.map((category) => (
            <button
              key={category.categoryId}
              type="button"
              className={
                selectedCategoryId === category.categoryId ? styles.categoryButtonActive : styles.categoryButton
              }
              onClick={() => setSelectedCategoryId(category.categoryId)}
            >
              {category.name}
            </button>
          ))}
        </aside>

        <main className={styles.main}>
          <h1 className={styles.title}>Shop</h1>

          {isLoading ? (
            <FullPageLoader label="Loading products…" />
          ) : loadError ? (
            <p className={styles.errorText}>{loadError}</p>
          ) : products.length === 0 ? (
            <p className={styles.emptyState}>No products found in this category yet.</p>
          ) : (
            <div className={styles.grid}>
              {products.map((product) => (
                <ProductCard key={product.productId} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
