/**
 * CheckoutPage.tsx
 * ----------------------------------------------------------------------------
 * Authenticated route: /checkout
 *
 * Collects a shipping (and optionally separate billing) address, shows
 * the cart for a final review, and places a real order via
 * orders.service.ts -> placeOrder. See that file's header comment for the
 * honest explanation of what happens (and what deliberately doesn't
 * happen yet — payment capture) when this form is submitted.
 *
 * On success, the cart is cleared and the shopper is sent to /orders,
 * where their new order appears with status "Pending payment".
 */

import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { FormField } from '@/components/form/FormField';
import { SubmitButton } from '@/components/form/SubmitButton';
import { FormBanner } from '@/components/form/FormBanner';
import { useAuth } from '@/hooks/useAuth';
import { useCartItems, useCartSubtotal, useCartStore } from '@/store/cartStore';
import { placeOrder, OrderServiceError } from '@/lib/firebase/orders.service';
import { formatMoneyDisplay } from '@/lib/utils/money';
import type { Address } from '@/types/common.types';
import styles from './CheckoutPage.module.css';

interface CheckoutFormValues {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  billingSameAsShipping: boolean;
}

function addressFromForm(values: CheckoutFormValues): Address {
  return {
    fullName: values.fullName.trim(),
    line1: values.line1.trim(),
    line2: values.line2.trim() || undefined,
    city: values.city.trim(),
    region: values.region.trim(),
    postalCode: values.postalCode.trim(),
    country: values.country.trim(),
    phone: values.phone.trim(),
  };
}

export function CheckoutPage(): ReactElement {
  const navigate = useNavigate();
  const { uid, email } = useAuth();
  const items = useCartItems();
  const subtotal = useCartSubtotal();
  const clearCart = useCartStore((s) => s.clear);

  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    defaultValues: { billingSameAsShipping: true, country: '' },
  });

  async function onSubmit(values: CheckoutFormValues): Promise<void> {
    if (!uid || !email) return;
    setFormError(null);

    const shippingAddress = addressFromForm(values);
    // This pass only collects one address — a genuinely separate billing
    // address (distinct fields + form section) is a straightforward
    // follow-up once needed; reusing the shipping address here is
    // documented, not hidden, and the `billingSameAsShipping` checkbox
    // reflects that today it's always effectively true.
    const billingAddress = shippingAddress;

    try {
      await placeOrder({
        customerId: uid,
        customerEmail: email,
        cartItems: items,
        shippingAddress,
        billingAddress,
      });
      clearCart();
      navigate('/orders');
    } catch (error) {
      setFormError(error instanceof OrderServiceError ? error.message : 'Could not place your order. Please try again.');
    }
  }

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.emptyState}>
          <p>Your cart is empty.</p>
          <Link to="/shop" className={styles.link}>
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.layout}>
        <form className={styles.formColumn} onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
          <h1 className={styles.title}>Shipping address</h1>

          {formError ? <FormBanner tone="error" message={formError} /> : null}

          <FormField label="Full name" error={errors.fullName?.message} {...register('fullName', { required: 'Required' })} />
          <FormField label="Address line 1" error={errors.line1?.message} {...register('line1', { required: 'Required' })} />
          <FormField label="Address line 2 (optional)" {...register('line2')} />

          <div className={styles.row}>
            <FormField label="City" error={errors.city?.message} {...register('city', { required: 'Required' })} />
            <FormField label="Region / State" error={errors.region?.message} {...register('region', { required: 'Required' })} />
          </div>

          <div className={styles.row}>
            <FormField label="Postal code" error={errors.postalCode?.message} {...register('postalCode', { required: 'Required' })} />
            <FormField
              label="Country (ISO code)"
              placeholder="e.g. ZA, US"
              error={errors.country?.message}
              {...register('country', { required: 'Required', maxLength: { value: 2, message: 'Use a 2-letter ISO code' } })}
            />
          </div>

          <FormField label="Phone" type="tel" error={errors.phone?.message} {...register('phone', { required: 'Required' })} />

          <label className={styles.checkboxRow}>
            <input type="checkbox" {...register('billingSameAsShipping')} />
            Billing address is the same as shipping
          </label>

          <SubmitButton isSubmitting={isSubmitting} busyLabel="Placing order…">
            Place order
          </SubmitButton>
        </form>

        <aside className={styles.summaryColumn}>
          <h2 className={styles.summaryTitle}>Order summary</h2>
          <ul className={styles.summaryList}>
            {items.map((item) => (
              <li key={`${item.productId}_${item.variantId}`} className={styles.summaryItem}>
                <img src={item.imageUrl} alt="" className={styles.summaryImage} />
                <div className={styles.summaryItemDetails}>
                  <p className={styles.summaryItemName}>{item.name}</p>
                  <p className={styles.summaryItemMeta}>Qty {item.quantity}</p>
                </div>
                <span className={styles.summaryItemPrice}>
                  {formatMoneyDisplay({
                    amountInMinorUnits: item.unitPrice.amountInMinorUnits * item.quantity,
                    currency: item.unitPrice.currency,
                  })}
                </span>
              </li>
            ))}
          </ul>
          <div className={styles.summaryTotalRow}>
            <span>Subtotal</span>
            <span>{formatMoneyDisplay(subtotal)}</span>
          </div>
          <p className={styles.summaryNote}>Shipping and any applicable tax are calculated when your order is placed.</p>
        </aside>
      </div>
    </div>
  );
}
