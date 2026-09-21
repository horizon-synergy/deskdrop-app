/**
 * CategoryForm.tsx
 * ----------------------------------------------------------------------------
 * Create/edit form for a single category. Used both for "new category"
 * (initialValue is undefined) and "edit category" (initialValue is the
 * existing document) from AdminCategoriesPage. Slug auto-fills from the
 * name field via slugify() but stays manually editable — an admin may
 * want a shorter or different slug than a literal transliteration of the
 * name.
 */

import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/form/FormField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { ImageUploader } from '@/components/form/ImageUploader';
import { SubmitButton } from '@/components/form/SubmitButton';
import { FormBanner } from '@/components/form/FormBanner';
import { slugify } from '@/lib/utils/slug';
import { createCategory, updateCategory } from '@/lib/firebase/categories.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import type { CategoryDocument, NewCategoryInput } from '@/types/category.types';
import styles from './CategoryForm.module.css';

interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  parentCategoryId: string;
  displayOrder: number;
  isVisible: boolean;
}

interface CategoryFormProps {
  /** Existing category being edited, or null when creating a new one. */
  initialValue: CategoryDocument | null;
  /** Categories available to pick as a parent (top-level categories, minus self). */
  availableParents: CategoryDocument[];
  onSaved: () => void;
  onCancel: () => void;
}

export function CategoryForm({
  initialValue,
  availableParents,
  onSaved,
  onCancel,
}: CategoryFormProps): ReactElement {
  const [imageUrl, setImageUrl] = useState<string | null>(initialValue?.imageUrl ?? null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    defaultValues: {
      name: initialValue?.name ?? '',
      slug: initialValue?.slug ?? '',
      description: initialValue?.description ?? '',
      parentCategoryId: initialValue?.parentCategoryId ?? '',
      displayOrder: initialValue?.displayOrder ?? 0,
      isVisible: initialValue?.isVisible ?? true,
    },
  });

  const nameValue = watch('name');

  async function onSubmit(values: CategoryFormValues): Promise<void> {
    setFormError(null);
    const input: NewCategoryInput = {
      name: values.name.trim(),
      slug: values.slug.trim() || slugify(values.name),
      description: values.description.trim(),
      imageUrl,
      parentCategoryId: values.parentCategoryId || null,
      displayOrder: Number(values.displayOrder),
      isVisible: values.isVisible,
    };

    try {
      if (initialValue) {
        await updateCategory(initialValue.categoryId, input);
      } else {
        await createCategory(input);
      }
      onSaved();
    } catch (error) {
      setFormError(describeFirestoreError(error, 'Could not save this category. Please try again.'));
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
      {formError ? <FormBanner tone="error" message={formError} /> : null}

      <FormField
        label="Name"
        error={errors.name?.message}
        {...register('name', {
          required: 'Category name is required.',
          onChange: (e) => {
            // Only auto-fill the slug while the admin hasn't hand-edited
            // it — once they touch the slug field directly, stop overriding it.
            if (!watch('slug') || watch('slug') === slugify(nameValue)) {
              setValue('slug', slugify(e.target.value));
            }
          },
        })}
      />

      <FormField label="Slug" error={errors.slug?.message} {...register('slug', { required: 'Slug is required.' })} />

      <TextAreaField label="Description" {...register('description')} />

      <SelectField
        label="Parent category"
        placeholder="None (top-level category)"
        options={availableParents
          .filter((category) => category.categoryId !== initialValue?.categoryId)
          .map((category) => ({ value: category.categoryId, label: category.name }))}
        {...register('parentCategoryId')}
      />

      <FormField
        label="Display order"
        type="number"
        {...register('displayOrder', { valueAsNumber: true })}
      />

      <ImageUploader label="Category image" value={imageUrl ? [imageUrl] : []} onChange={(urls) => setImageUrl(urls[urls.length - 1] ?? null)} folder="deskdrop/categories" />

      <label className={styles.checkboxRow}>
        <input type="checkbox" {...register('isVisible')} />
        Visible in navigation and shop pages
      </label>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
        <SubmitButton isSubmitting={isSubmitting} busyLabel="Saving…">
          {initialValue ? 'Save changes' : 'Create category'}
        </SubmitButton>
      </div>
    </form>
  );
}
