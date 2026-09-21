/**
 * AdjustStockModal.tsx
 * ----------------------------------------------------------------------------
 * Form used by AdminInventoryPage to record a stock movement against a
 * single variant. Every submission goes through inventory.service.ts ->
 * adjustStock, which is the only place stock counters actually change —
 * this component just collects and validates the inputs (reason,
 * quantity, optional note) and reports the acting staff member's uid so
 * the movement log stays attributable.
 */

import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/Modal';
import { FormField } from '@/components/form/FormField';
import { SelectField } from '@/components/form/SelectField';
import { SubmitButton } from '@/components/form/SubmitButton';
import { FormBanner } from '@/components/form/FormBanner';
import { adjustStock } from '@/lib/firebase/inventory.service';
import { useAuth } from '@/hooks/useAuth';
import type { StockMovementReason } from '@/types/inventory.types';

interface AdjustStockModalProps {
  isOpen: boolean;
  productName: string;
  variantLabel: string;
  productId: string;
  variantId: string;
  onSaved: () => void;
  onClose: () => void;
}

interface AdjustStockFormValues {
  direction: 'add' | 'remove';
  quantity: number;
  reason: StockMovementReason;
  note: string;
}

const REASONS_FOR_ADD: Array<{ value: StockMovementReason; label: string }> = [
  { value: 'restock', label: 'Restock' },
  { value: 'return', label: 'Customer return' },
  { value: 'manual_correction', label: 'Manual correction' },
];

const REASONS_FOR_REMOVE: Array<{ value: StockMovementReason; label: string }> = [
  { value: 'damaged', label: 'Damaged / written off' },
  { value: 'manual_correction', label: 'Manual correction' },
];

export function AdjustStockModal({
  isOpen,
  productName,
  variantLabel,
  productId,
  variantId,
  onSaved,
  onClose,
}: AdjustStockModalProps): ReactElement {
  const { uid } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustStockFormValues>({
    defaultValues: { direction: 'add', quantity: 1, reason: 'restock', note: '' },
  });

  const direction = watch('direction');

  async function onSubmit(values: AdjustStockFormValues): Promise<void> {
    if (!uid) return;
    setFormError(null);
    try {
      await adjustStock({
        productId,
        variantId,
        quantityDelta: direction === 'add' ? Math.abs(values.quantity) : -Math.abs(values.quantity),
        reason: values.reason,
        actorId: uid,
        note: values.note.trim() || undefined,
      });
      reset();
      onSaved();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not update stock. Please try again.');
    }
  }

  return (
    <Modal isOpen={isOpen} title={`Adjust stock — ${productName} · ${variantLabel}`} onClose={onClose}>
      {formError ? <FormBanner tone="error" message={formError} /> : null}

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <SelectField
          label="Direction"
          options={[
            { value: 'add', label: 'Add stock' },
            { value: 'remove', label: 'Remove stock' },
          ]}
          {...register('direction')}
        />

        <FormField
          label="Quantity"
          type="number"
          min={1}
          error={errors.quantity?.message}
          {...register('quantity', { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Must be at least 1' } })}
        />

        <SelectField
          label="Reason"
          options={direction === 'add' ? REASONS_FOR_ADD : REASONS_FOR_REMOVE}
          {...register('reason')}
        />

        <FormField label="Note (optional)" {...register('note')} />

        <SubmitButton isSubmitting={isSubmitting} busyLabel="Saving…">
          Record adjustment
        </SubmitButton>
      </form>
    </Modal>
  );
}
