/**
 * PromotionForm.tsx
 * ----------------------------------------------------------------------------
 * Create/edit form for a single discount code. Discount value is entered
 * as either a whole-number percentage or a decimal dollar amount
 * depending on the selected discount type — the form switches the input's
 * meaning (and validation) based on `discountType`, then converts a fixed
 * -amount entry to minor units on submit (percentage values are stored
 * as-is, e.g. 10 meaning 10%).
 */

import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/form/FormField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { SubmitButton } from '@/components/form/SubmitButton';
import { FormBanner } from '@/components/form/FormBanner';
import { createPromotion, updatePromotion, type NewPromotionInput } from '@/lib/firebase/promotions.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import type { PromotionDocument, PromotionDiscountType } from '@/types/promotion.types';
import styles from './PromotionForm.module.css';

interface PromotionFormValues {
  code: string;
  description: string;
  discountType: PromotionDiscountType;
  discountValueInput: string;
  minimumSubtotalInput: string;
  startsAt: string;
  endsAt: string;
  usageLimitInput: string;
  isActive: boolean;
}

interface PromotionFormProps {
  initialValue: PromotionDocument | null;
  onSaved: () => void;
  onCancel: () => void;
}

function toDateInputValue(iso: string): string {
  return iso ? iso.slice(0, 10) : '';
}

export function PromotionForm({ initialValue, onSaved, onCancel }: PromotionFormProps): ReactElement {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PromotionFormValues>({
    defaultValues: {
      code: initialValue?.code ?? '',
      description: initialValue?.description ?? '',
      discountType: initialValue?.discountType ?? 'percentage',
      discountValueInput:
        initialValue?.discountType === 'fixed_amount'
          ? ((initialValue.discountValue / 100).toFixed(2))
          : (initialValue?.discountValue.toString() ?? ''),
      minimumSubtotalInput: initialValue?.minimumSubtotal ? (initialValue.minimumSubtotal / 100).toFixed(2) : '',
      startsAt: toDateInputValue(initialValue?.startsAt ?? ''),
      endsAt: toDateInputValue(initialValue?.endsAt ?? ''),
      usageLimitInput: initialValue?.usageLimit?.toString() ?? '',
      isActive: initialValue?.isActive ?? true,
    },
  });

  const discountType = watch('discountType');

  async function onSubmit(values: PromotionFormValues): Promise<void> {
    setFormError(null);

    const discountValue =
      values.discountType === 'percentage'
        ? Math.round(Number(values.discountValueInput))
        : Math.round(Number(values.discountValueInput) * 100);

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setFormError('Enter a valid discount value.');
      return;
    }

    const input: NewPromotionInput = {
      code: values.code,
      description: values.description.trim(),
      discountType: values.discountType,
      discountValue,
      minimumSubtotal: values.minimumSubtotalInput ? Math.round(Number(values.minimumSubtotalInput) * 100) : null,
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: new Date(values.endsAt).toISOString(),
      usageLimit: values.usageLimitInput ? Number(values.usageLimitInput) : null,
      isActive: values.isActive,
    };

    try {
      if (initialValue) {
        await updatePromotion(initialValue.promotionId, input);
      } else {
        await createPromotion(input);
      }
      onSaved();
    } catch (error) {
      setFormError(describeFirestoreError(error, 'Could not save this promotion. Please try again.'));
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
      {formError ? <FormBanner tone="error" message={formError} /> : null}

      <FormField
        label="Code"
        placeholder="e.g. WELCOME10"
        error={errors.code?.message}
        {...register('code', { required: 'Required' })}
      />

      <TextAreaField label="Description" rows={2} {...register('description')} />

      <SelectField
        label="Discount type"
        options={[
          { value: 'percentage', label: 'Percentage off' },
          { value: 'fixed_amount', label: 'Fixed amount off' },
        ]}
        {...register('discountType')}
      />

      <FormField
        label={discountType === 'percentage' ? 'Percentage (e.g. 10 for 10%)' : 'Amount off (USD)'}
        inputMode="decimal"
        error={errors.discountValueInput?.message}
        {...register('discountValueInput', { required: 'Required' })}
      />

      <FormField label="Minimum order subtotal (USD, optional)" inputMode="decimal" {...register('minimumSubtotalInput')} />

      <div className={styles.row}>
        <FormField label="Starts" type="date" error={errors.startsAt?.message} {...register('startsAt', { required: 'Required' })} />
        <FormField label="Ends" type="date" error={errors.endsAt?.message} {...register('endsAt', { required: 'Required' })} />
      </div>

      <FormField label="Usage limit (optional)" type="number" min={1} {...register('usageLimitInput')} />

      <label className={styles.checkboxRow}>
        <input type="checkbox" {...register('isActive')} />
        Active
      </label>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
        <SubmitButton isSubmitting={isSubmitting} busyLabel="Saving…">
          {initialValue ? 'Save changes' : 'Create promotion'}
        </SubmitButton>
      </div>
    </form>
  );
}
