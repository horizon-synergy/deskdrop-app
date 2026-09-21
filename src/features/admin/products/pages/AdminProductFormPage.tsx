/**
 * AdminProductFormPage.tsx
 * ----------------------------------------------------------------------------
 * Admin routes: /admin/products/new and /admin/products/:productId/edit
 * (manager+). A single page component handles both create and edit —
 * when `productId` is present in the URL params, it loads the existing
 * product and pre-fills the form; otherwise it starts blank.
 *
 * This is a full page rather than a modal (unlike CategoryForm) because
 * the variant list can grow long enough that a modal would be cramped —
 * products are the most structurally complex entity in the catalog.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { FormField } from '@/components/form/FormField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { ImageUploader } from '@/components/form/ImageUploader';
import { SubmitButton } from '@/components/form/SubmitButton';
import { FormBanner } from '@/components/form/FormBanner';
import { FullPageLoader } from '@/components/FullPageLoader';
import { VariantsField } from '../components/VariantsField';
import { variantToFormRow, formRowToVariant, type ProductFormValues } from '../components/productFormTypes';
import { slugify } from '@/lib/utils/slug';
import { listCategories } from '@/lib/firebase/categories.service';
import { getProduct, createProduct, updateProduct } from '@/lib/firebase/products.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import type { CategoryDocument } from '@/types/category.types';
import type { NewProductInput } from '@/types/product.types';
import styles from './AdminProductFormPage.module.css';

export function AdminProductFormPage(): ReactElement {
  const { productId } = useParams<{ productId?: string }>();
  const isEditing = Boolean(productId);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryDocument[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      categoryIds: [],
      tagsText: '',
      status: 'draft',
      variants: [],
    },
  });

  const nameValue = watch('name');

  useEffect(() => {
    async function loadData(): Promise<void> {
      setIsLoading(true);
      setLoadError(null);
      try {
        const categoryList = await listCategories();
        setCategories(categoryList);

        if (productId) {
          const product = await getProduct(productId);
          if (!product) {
            setLoadError('Product not found.');
            return;
          }
          setImageUrls(product.imageUrls);
          setValue('name', product.name);
          setValue('slug', product.slug);
          setValue('description', product.description);
          setValue('categoryIds', product.categoryIds);
          setValue('tagsText', product.tags.join(', '));
          setValue('status', product.status);
          setValue('variants', product.variants.map(variantToFormRow));
        }
      } catch (error) {
        setLoadError(describeFirestoreError(error, 'Could not load this page. Please refresh.'));
      } finally {
        setIsLoading(false);
      }
    }
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function onSubmit(values: ProductFormValues): Promise<void> {
    setFormError(null);

    if (values.variants.length === 0) {
      setFormError('Add at least one variant before saving.');
      return;
    }
    if (imageUrls.length === 0) {
      setFormError('Add at least one product image before saving.');
      return;
    }

    let variants;
    try {
      variants = values.variants.map((row) => formRowToVariant(row));
    } catch (variantError) {
      setFormError(variantError instanceof Error ? variantError.message : 'Invalid variant data.');
      return;
    }

    const input: NewProductInput = {
      name: values.name.trim(),
      slug: values.slug.trim() || slugify(values.name),
      description: values.description.trim(),
      categoryIds: values.categoryIds,
      imageUrls,
      variants,
      tags: values.tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: values.status,
    };

    try {
      if (productId) {
        await updateProduct(productId, input);
      } else {
        await createProduct(input);
      }
      navigate('/admin/products');
    } catch (error) {
      setFormError(describeFirestoreError(error, 'Could not save this product. Please try again.'));
    }
  }

  if (isLoading) {
    return <FullPageLoader label="Loading…" />;
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <p className={styles.errorText}>{loadError}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{isEditing ? 'Edit product' : 'New product'}</h1>

        {formError ? <FormBanner tone="error" message={formError} /> : null}

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
          <FormField
            label="Name"
            error={errors.name?.message}
            {...register('name', {
              required: 'Product name is required.',
              onChange: (e) => {
                if (!watch('slug') || watch('slug') === slugify(nameValue)) {
                  setValue('slug', slugify(e.target.value));
                }
              },
            })}
          />

          <FormField label="Slug" error={errors.slug?.message} {...register('slug', { required: 'Slug is required.' })} />

          <TextAreaField
            label="Description"
            rows={5}
            error={errors.description?.message}
            {...register('description', { required: 'Description is required.' })}
          />

          <fieldset className={styles.categoryFieldset}>
            <legend className={styles.categoryLegend}>Categories</legend>
            {categories.length === 0 ? (
              <p className={styles.mutedText}>No categories yet — create one first from the Categories page.</p>
            ) : (
              <div className={styles.categoryGrid}>
                {categories.map((category) => (
                  <label key={category.categoryId} className={styles.categoryOption}>
                    <input
                      type="checkbox"
                      value={category.categoryId}
                      {...register('categoryIds')}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <FormField label="Tags (comma-separated)" placeholder="eco-friendly, gift, bestseller" {...register('tagsText')} />

          <SelectField
            label="Status"
            options={[
              { value: 'draft', label: 'Draft — hidden from the storefront' },
              { value: 'active', label: 'Active — visible in the shop' },
              { value: 'archived', label: 'Archived — no longer sold' },
            ]}
            {...register('status')}
          />

          <ImageUploader
            label="Product images"
            value={imageUrls}
            onChange={setImageUrls}
            folder="deskdrop/products"
          />

          <VariantsField control={control} register={register} errors={errors} />

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={() => navigate('/admin/products')}>
              Cancel
            </button>
            <SubmitButton isSubmitting={isSubmitting} busyLabel="Saving…">
              {isEditing ? 'Save changes' : 'Create product'}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
