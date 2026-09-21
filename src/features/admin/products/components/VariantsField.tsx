/**
 * VariantsField.tsx
 * ----------------------------------------------------------------------------
 * Manages the `variants` array within the product form using React Hook
 * Form's `useFieldArray`, which is the standard pattern for dynamic
 * repeating field groups (add/remove rows) — it keeps each row's inputs
 * correctly keyed and avoids the classic "stale index" bugs you get from
 * hand-rolling array state alongside a form.
 *
 * Every product must have at least one variant (see AdminProductFormPage's
 * submit validation) — even a "single option" product like a plain pen
 * models that option as one variant, so the schema never needs a special
 * case for "products without variants".
 */

import type { ReactElement } from 'react';
import { useFieldArray, type Control, type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { FormField } from '@/components/form/FormField';
import type { ProductFormValues } from './productFormTypes';
import styles from './VariantsField.module.css';

interface VariantsFieldProps {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
}

export function VariantsField({ control, register, errors }: VariantsFieldProps): ReactElement {
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Variants</span>
        <button
          type="button"
          className={styles.addButton}
          onClick={() =>
            append({ label: '', sku: '', priceInput: '', attributesText: '' })
          }
        >
          <PlusIcon width={14} height={14} />
          Add variant
        </button>
      </div>

      {fields.length === 0 ? (
        <p className={styles.emptyHint}>
          Add at least one variant — e.g. a size, color, or ruling option customers can select.
        </p>
      ) : null}

      {fields.map((field, index) => (
        <div key={field.id} className={styles.variantRow}>
          <div className={styles.variantGrid}>
            <FormField
              label="Label"
              placeholder="e.g. A5 · Ruled · Navy"
              error={errors.variants?.[index]?.label?.message}
              {...register(`variants.${index}.label`, { required: 'Required' })}
            />
            <FormField
              label="SKU"
              placeholder="e.g. NB-A5-RL-NVY"
              error={errors.variants?.[index]?.sku?.message}
              {...register(`variants.${index}.sku`, { required: 'Required' })}
            />
            <FormField
              label="Price (USD)"
              placeholder="24.99"
              inputMode="decimal"
              error={errors.variants?.[index]?.priceInput?.message}
              {...register(`variants.${index}.priceInput`, {
                required: 'Required',
                pattern: { value: /^\d+(\.\d{1,2})?$/, message: 'Enter a valid price, e.g. 24.99' },
              })}
            />
            <FormField
              label="Attributes"
              placeholder="size:A5, ruling:Ruled, color:Navy"
              error={errors.variants?.[index]?.attributesText?.message}
              {...register(`variants.${index}.attributesText`)}
            />
          </div>
          <button
            type="button"
            className={styles.removeButton}
            onClick={() => remove(index)}
            aria-label="Remove variant"
          >
            <TrashIcon width={16} height={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
