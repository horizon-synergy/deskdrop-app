/**
 * AdminProductsPage.tsx
 * ----------------------------------------------------------------------------
 * Admin route: /admin/products (manager+).
 *
 * Lists every product regardless of status (draft/active/archived) — the
 * admin view intentionally does NOT filter to 'active' the way the public
 * shop will, since staff need visibility into drafts awaiting publish and
 * archived items for historical reference. Supports filtering by status
 * and a client-side text search over name/SKU, and links out to the
 * create/edit form page for each product.
 */

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilIcon, ArchiveBoxIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FullPageLoader } from '@/components/FullPageLoader';
import { listProducts, archiveProduct, deleteDraftProduct } from '@/lib/firebase/products.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import { formatMoneyDisplay } from '@/lib/utils/money';
import type { ProductDocument, ProductStatus } from '@/types/product.types';
import styles from './AdminProductsPage.module.css';

const STATUS_FILTERS: Array<{ value: ProductStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export function AdminProductsPage(): ReactElement {
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingArchive, setPendingArchive] = useState<ProductDocument | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductDocument | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadProducts(): Promise<void> {
    setIsLoading(true);
    setLoadError(null);
    try {
      const results = await listProducts(statusFilter === 'all' ? {} : { status: statusFilter });
      setProducts(results);
    } catch (error) {
      setLoadError(describeFirestoreError(error, 'Could not load products. Please refresh the page.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.variants.some((variant) => variant.sku.toLowerCase().includes(term)),
    );
  }, [products, searchTerm]);

  async function confirmArchive(): Promise<void> {
    if (!pendingArchive) return;
    setActionError(null);
    try {
      await archiveProduct(pendingArchive.productId);
      setPendingArchive(null);
      void loadProducts();
    } catch (error) {
      setActionError(describeFirestoreError(error, 'Could not archive this product. Please try again.'));
      setPendingArchive(null);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    setActionError(null);
    try {
      await deleteDraftProduct(pendingDelete.productId);
      setPendingDelete(null);
      void loadProducts();
    } catch (error) {
      setActionError(describeFirestoreError(error, 'Could not delete this product. Please try again.'));
      setPendingDelete(null);
    }
  }

  if (isLoading) {
    return <FullPageLoader label="Loading products…" />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Products</h1>
          <p className={styles.subtitle}>Manage DeskDrop&apos;s catalog of owned inventory.</p>
        </div>
        <Link to="/admin/products/new" className={styles.primaryButton}>
          <PlusIcon width={16} height={16} />
          New product
        </Link>
      </header>

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Search by name or SKU…"
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className={styles.filterGroup}>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={statusFilter === filter.value ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loadError ? <p className={styles.errorText}>{loadError}</p> : null}
      {actionError ? <p className={styles.errorText}>{actionError}</p> : null}

      {filteredProducts.length === 0 && !loadError ? (
        <p className={styles.emptyState}>No products match this view.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Status</th>
              <th>Variants</th>
              <th>Price range</th>
              <th>Units sold</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const prices = product.variants.map((v) => v.price.amountInMinorUnits);
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);
              const currency = product.variants[0]?.price.currency ?? 'USD';

              return (
                <tr key={product.productId}>
                  <td className={styles.productCell}>
                    {product.imageUrls[0] ? (
                      <img src={product.imageUrls[0]} alt="" className={styles.thumb} />
                    ) : (
                      <div className={styles.thumbPlaceholder} />
                    )}
                    <span>{product.name}</span>
                  </td>
                  <td>
                    <span className={styles[`status_${product.status}`]}>{product.status}</span>
                  </td>
                  <td className={styles.mutedCell}>{product.variants.length}</td>
                  <td className={styles.mutedCell}>
                    {prices.length === 0
                      ? '—'
                      : minPrice === maxPrice
                        ? formatMoneyDisplay({ amountInMinorUnits: minPrice, currency })
                        : `${formatMoneyDisplay({ amountInMinorUnits: minPrice, currency })} – ${formatMoneyDisplay({ amountInMinorUnits: maxPrice, currency })}`}
                  </td>
                  <td className={styles.mutedCell}>{product.unitsSold}</td>
                  <td className={styles.actionsCell}>
                    <Link
                      to={`/admin/products/${product.productId}/edit`}
                      className={styles.iconButton}
                      aria-label={`Edit ${product.name}`}
                    >
                      <PencilIcon width={16} height={16} />
                    </Link>
                    {product.status !== 'archived' ? (
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => setPendingArchive(product)}
                        aria-label={`Archive ${product.name}`}
                      >
                        <ArchiveBoxIcon width={16} height={16} />
                      </button>
                    ) : null}
                    {product.status === 'draft' ? (
                      <button
                        type="button"
                        className={styles.iconButtonDanger}
                        onClick={() => setPendingDelete(product)}
                        aria-label={`Delete ${product.name}`}
                      >
                        <TrashIcon width={16} height={16} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        isOpen={pendingArchive !== null}
        title="Archive product"
        message={`Archive "${pendingArchive?.name}"? It will be removed from the storefront but kept for order history.`}
        confirmLabel="Archive"
        tone="danger"
        onConfirm={() => void confirmArchive()}
        onCancel={() => setPendingArchive(null)}
      />

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete draft product"
        message={`Permanently delete "${pendingDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
