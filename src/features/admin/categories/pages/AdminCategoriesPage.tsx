/**
 * AdminCategoriesPage.tsx
 * ----------------------------------------------------------------------------
 * Admin route: /admin/categories (manager+ — see AppRouter.tsx, guarded by
 * <RequireRole minimumRole="manager"> nested inside <AdminRoute>).
 *
 * Full CRUD over the `categories` collection via categories.service.ts.
 * Every action here is real: list loads from Firestore on mount, create/edit
 * open a modal form that writes to Firestore, and delete requires
 * confirmation via <ConfirmDialog> before calling deleteCategory(). A
 * category that still has products assigned is blocked from deletion
 * client-side with a clear message (Firestore rules don't enforce this
 * particular referential-integrity check — that's a product-catalog
 * concern, not a security concern, so it belongs in application logic).
 */

import { useEffect, useState, type ReactElement } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FullPageLoader } from '@/components/FullPageLoader';
import { CategoryForm } from '../components/CategoryForm';
import { listCategories, deleteCategory } from '@/lib/firebase/categories.service';
import { listProducts } from '@/lib/firebase/products.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import type { CategoryDocument } from '@/types/category.types';
import styles from './AdminCategoriesPage.module.css';

export function AdminCategoriesPage(): ReactElement {
  const [categories, setCategories] = useState<CategoryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingCategory, setEditingCategory] = useState<CategoryDocument | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CategoryDocument | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadCategories(): Promise<void> {
    setIsLoading(true);
    setLoadError(null);
    try {
      const results = await listCategories();
      setCategories(results);
    } catch (error) {
      setLoadError(describeFirestoreError(error, 'Could not load categories. Please refresh the page.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  function openCreateForm(): void {
    setEditingCategory(null);
    setIsFormOpen(true);
  }

  function openEditForm(category: CategoryDocument): void {
    setEditingCategory(category);
    setIsFormOpen(true);
  }

  function handleFormSaved(): void {
    setIsFormOpen(false);
    void loadCategories();
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    setDeleteError(null);

    // Referential-integrity guard: don't allow deleting a category that
    // products are still assigned to, which would silently orphan those
    // products from the shop's category filters.
    const productsInCategory = await listProducts({ categoryId: pendingDelete.categoryId, maxResults: 1 });
    if (productsInCategory.length > 0) {
      setDeleteError('This category still has products assigned to it. Reassign or archive them first.');
      setPendingDelete(null);
      return;
    }

    try {
      await deleteCategory(pendingDelete.categoryId);
      setPendingDelete(null);
      void loadCategories();
    } catch (error) {
      setDeleteError(describeFirestoreError(error, 'Could not delete this category. Please try again.'));
      setPendingDelete(null);
    }
  }

  if (isLoading) {
    return <FullPageLoader label="Loading categories…" />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.subtitle}>Organize how products are grouped across the storefront.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={openCreateForm}>
          <PlusIcon width={16} height={16} />
          New category
        </button>
      </header>

      {loadError ? <p className={styles.errorText}>{loadError}</p> : null}
      {deleteError ? <p className={styles.errorText}>{deleteError}</p> : null}

      {categories.length === 0 && !loadError ? (
        <p className={styles.emptyState}>No categories yet. Create your first one to start organizing products.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Parent</th>
              <th>Visible</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.categoryId}>
                <td>{category.name}</td>
                <td className={styles.mutedCell}>{category.slug}</td>
                <td className={styles.mutedCell}>
                  {category.parentCategoryId
                    ? (categories.find((c) => c.categoryId === category.parentCategoryId)?.name ?? '—')
                    : '—'}
                </td>
                <td>
                  <span className={category.isVisible ? styles.badgeVisible : styles.badgeHidden}>
                    {category.isVisible ? 'Visible' : 'Hidden'}
                  </span>
                </td>
                <td className={styles.actionsCell}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => openEditForm(category)}
                    aria-label={`Edit ${category.name}`}
                  >
                    <PencilIcon width={16} height={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButtonDanger}
                    onClick={() => setPendingDelete(category)}
                    aria-label={`Delete ${category.name}`}
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
        title={editingCategory ? 'Edit category' : 'New category'}
        onClose={() => setIsFormOpen(false)}
      >
        <CategoryForm
          initialValue={editingCategory}
          availableParents={categories.filter((c) => c.parentCategoryId === null)}
          onSaved={handleFormSaved}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete category"
        message={`Delete "${pendingDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
