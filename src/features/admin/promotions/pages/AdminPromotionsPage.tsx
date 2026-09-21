/**
 * AdminPromotionsPage.tsx
 * ----------------------------------------------------------------------------
 * Admin route: /admin/promotions (manager+ — matching firestore.rules'
 * `promotions` write rule).
 *
 * Full CRUD over the `promotions` collection. A promotion that's already
 * been redeemed at least once (`timesUsed > 0`) can still be edited or
 * deactivated but not deleted — deleting it would leave past orders'
 * `appliedPromoCode` string pointing at nothing resolvable, which is a
 * data-integrity concern this page enforces client-side (Firestore rules
 * don't model this specific referential-integrity rule, matching the
 * same pattern already used for category deletion).
 */

import { useEffect, useState, type ReactElement } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FullPageLoader } from '@/components/FullPageLoader';
import { PromotionForm } from '../components/PromotionForm';
import { listPromotions, deletePromotion } from '@/lib/firebase/promotions.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import { formatMoneyDisplay } from '@/lib/utils/money';
import type { PromotionDocument } from '@/types/promotion.types';
import styles from './AdminPromotionsPage.module.css';

export function AdminPromotionsPage(): ReactElement {
  const [promotions, setPromotions] = useState<PromotionDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingPromotion, setEditingPromotion] = useState<PromotionDocument | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PromotionDocument | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadPromotions(): Promise<void> {
    setIsLoading(true);
    setLoadError(null);
    try {
      setPromotions(await listPromotions());
    } catch (error) {
      setLoadError(describeFirestoreError(error, 'Could not load promotions. Please refresh the page.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPromotions();
  }, []);

  function openCreateForm(): void {
    setEditingPromotion(null);
    setIsFormOpen(true);
  }

  function openEditForm(promotion: PromotionDocument): void {
    setEditingPromotion(promotion);
    setIsFormOpen(true);
  }

  function handleFormSaved(): void {
    setIsFormOpen(false);
    void loadPromotions();
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    setDeleteError(null);

    if (pendingDelete.timesUsed > 0) {
      setDeleteError('This code has already been redeemed and can\u2019t be deleted — deactivate it instead.');
      setPendingDelete(null);
      return;
    }

    try {
      await deletePromotion(pendingDelete.promotionId);
      setPendingDelete(null);
      void loadPromotions();
    } catch (error) {
      setDeleteError(describeFirestoreError(error, 'Could not delete this promotion. Please try again.'));
      setPendingDelete(null);
    }
  }

  function describeDiscount(promotion: PromotionDocument): string {
    return promotion.discountType === 'percentage'
      ? `${promotion.discountValue}% off`
      : `${formatMoneyDisplay({ amountInMinorUnits: promotion.discountValue, currency: 'USD' })} off`;
  }

  if (isLoading) {
    return <FullPageLoader label="Loading promotions…" />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Promotions</h1>
          <p className={styles.subtitle}>Discount codes customers can apply at checkout.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={openCreateForm}>
          <PlusIcon width={16} height={16} />
          New promotion
        </button>
      </header>

      {loadError ? <p className={styles.errorText}>{loadError}</p> : null}
      {deleteError ? <p className={styles.errorText}>{deleteError}</p> : null}

      {promotions.length === 0 && !loadError ? (
        <p className={styles.emptyState}>No promotions yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Window</th>
              <th>Used</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {promotions.map((promotion) => (
              <tr key={promotion.promotionId}>
                <td className={styles.codeCell}>{promotion.code}</td>
                <td className={styles.mutedCell}>{describeDiscount(promotion)}</td>
                <td className={styles.mutedCell}>
                  {new Date(promotion.startsAt).toLocaleDateString()} – {new Date(promotion.endsAt).toLocaleDateString()}
                </td>
                <td className={styles.mutedCell}>
                  {promotion.timesUsed}
                  {promotion.usageLimit ? ` / ${promotion.usageLimit}` : ''}
                </td>
                <td>
                  <span className={promotion.isActive ? styles.badgeActive : styles.badgeInactive}>
                    {promotion.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className={styles.actionsCell}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => openEditForm(promotion)}
                    aria-label={`Edit ${promotion.code}`}
                  >
                    <PencilIcon width={16} height={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButtonDanger}
                    onClick={() => setPendingDelete(promotion)}
                    aria-label={`Delete ${promotion.code}`}
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={isFormOpen}
        title={editingPromotion ? 'Edit promotion' : 'New promotion'}
        onClose={() => setIsFormOpen(false)}
      >
        <PromotionForm initialValue={editingPromotion} onSaved={handleFormSaved} onCancel={() => setIsFormOpen(false)} />
      </Modal>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete promotion"
        message={`Delete "${pendingDelete?.code}"? This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
