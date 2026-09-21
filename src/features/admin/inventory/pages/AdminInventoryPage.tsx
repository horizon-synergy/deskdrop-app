/**
 * AdminInventoryPage.tsx
 * ----------------------------------------------------------------------------
 * Admin route: /admin/inventory (staff+ — the base admin-area minimum,
 * matching firestore.rules' `inventory` read/write rule exactly, so no
 * <RequireRole> wrapper beyond <AdminRoute> is needed for this route).
 *
 * Joins the product catalog (every variant of every non-archived product)
 * against the `inventory` collection to render one row per variant. A
 * variant that's never been stocked shows "Not initialized" with a button
 * to create its inventory record at zero, rather than being silently
 * omitted — staff need visibility into catalog items that have no stock
 * record yet just as much as ones running low.
 */

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { ExclamationTriangleIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { FullPageLoader } from '@/components/FullPageLoader';
import { AdjustStockModal } from '../components/AdjustStockModal';
import { listProducts } from '@/lib/firebase/products.service';
import { listAllInventory, ensureInventoryDoc } from '@/lib/firebase/inventory.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import type { ProductDocument, ProductVariant } from '@/types/product.types';
import type { InventoryDocument } from '@/types/inventory.types';
import styles from './AdminInventoryPage.module.css';

interface VariantRow {
  product: ProductDocument;
  variant: ProductVariant;
  inventory: InventoryDocument | null;
}

export function AdminInventoryPage(): ReactElement {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initializingKey, setInitializingKey] = useState<string | null>(null);
  const [adjustingRow, setAdjustingRow] = useState<VariantRow | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  async function loadData(): Promise<void> {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [products, inventoryDocs] = await Promise.all([
        listProducts({}), // every status — staff need visibility into draft stock too
        listAllInventory(),
      ]);
      const inventoryByKey = new Map(inventoryDocs.map((doc) => [doc.inventoryId, doc]));

      const nextRows: VariantRow[] = [];
      for (const product of products) {
        if (product.status === 'archived') continue;
        for (const variant of product.variants) {
          nextRows.push({
            product,
            variant,
            inventory: inventoryByKey.get(`${product.productId}_${variant.variantId}`) ?? null,
          });
        }
      }
      setRows(nextRows);
    } catch (error) {
      setLoadError(describeFirestoreError(error, 'Could not load inventory. Please refresh the page.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleInitialize(row: VariantRow): Promise<void> {
    const key = `${row.product.productId}_${row.variant.variantId}`;
    setInitializingKey(key);
    try {
      await ensureInventoryDoc(row.product.productId, row.variant.variantId, row.variant.sku);
      await loadData();
    } catch (error) {
      setLoadError(describeFirestoreError(error, 'Could not initialize this variant. Please try again.'));
    } finally {
      setInitializingKey(null);
    }
  }

  const visibleRows = useMemo(() => {
    if (!showLowStockOnly) return rows;
    return rows.filter((row) => row.inventory && row.inventory.quantityOnHand <= row.inventory.lowStockThreshold);
  }, [rows, showLowStockOnly]);

  if (isLoading) {
    return <FullPageLoader label="Loading inventory…" />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inventory</h1>
          <p className={styles.subtitle}>Stock levels across every product variant.</p>
        </div>
        <label className={styles.filterToggle}>
          <input type="checkbox" checked={showLowStockOnly} onChange={(e) => setShowLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
      </header>

      {loadError ? <p className={styles.errorText}>{loadError}</p> : null}

      {visibleRows.length === 0 && !loadError ? (
        <p className={styles.emptyState}>No variants to show.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>SKU</th>
              <th>On hand</th>
              <th>Low stock at</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const key = `${row.product.productId}_${row.variant.variantId}`;
              const isLow = row.inventory ? row.inventory.quantityOnHand <= row.inventory.lowStockThreshold : false;

              return (
                <tr key={key}>
                  <td>{row.product.name}</td>
                  <td className={styles.mutedCell}>{row.variant.label}</td>
                  <td className={styles.mutedCell}>{row.variant.sku}</td>
                  <td>
                    {row.inventory ? (
                      <span className={isLow ? styles.quantityLow : undefined}>
                        {isLow ? <ExclamationTriangleIcon width={14} height={14} /> : null}
                        {row.inventory.quantityOnHand}
                      </span>
                    ) : (
                      <span className={styles.mutedCell}>—</span>
                    )}
                  </td>
                  <td className={styles.mutedCell}>{row.inventory?.lowStockThreshold ?? '—'}</td>
                  <td className={styles.actionsCell}>
                    {row.inventory ? (
                      <button type="button" className={styles.actionButton} onClick={() => setAdjustingRow(row)}>
                        Adjust
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => void handleInitialize(row)}
                        disabled={initializingKey === key}
                      >
                        <PlusCircleIcon width={14} height={14} />
                        {initializingKey === key ? 'Initializing…' : 'Initialize'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {adjustingRow ? (
        <AdjustStockModal
          isOpen={adjustingRow !== null}
          productName={adjustingRow.product.name}
          variantLabel={adjustingRow.variant.label}
          productId={adjustingRow.product.productId}
          variantId={adjustingRow.variant.variantId}
          onSaved={() => {
            setAdjustingRow(null);
            void loadData();
          }}
          onClose={() => setAdjustingRow(null)}
        />
      ) : null}
    </div>
  );
}
