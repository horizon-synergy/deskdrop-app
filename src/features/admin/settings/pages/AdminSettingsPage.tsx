/**
 * AdminSettingsPage.tsx
 * ----------------------------------------------------------------------------
 * Admin route: /admin/settings (admin+ — matching firestore.rules'
 * `settings` write rule).
 *
 * Edits the single `settings/store` document (store name, support email,
 * default currency, and a storefront-open toggle used for maintenance
 * windows). Calls `ensureStoreSettingsDoc()` on load so a fresh Firebase
 * project gets a real persisted document the first time an admin visits
 * this page, rather than the form silently editing an in-memory default
 * that never got saved.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/form/FormField';
import { SubmitButton } from '@/components/form/SubmitButton';
import { FormBanner } from '@/components/form/FormBanner';
import { FullPageLoader } from '@/components/FullPageLoader';
import { ensureStoreSettingsDoc, updateStoreSettings } from '@/lib/firebase/settings.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import styles from './AdminSettingsPage.module.css';

interface SettingsFormValues {
  storeName: string;
  supportEmail: string;
  defaultCurrency: string;
  isStorefrontOpen: boolean;
}

export function AdminSettingsPage(): ReactElement {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>();

  useEffect(() => {
    async function loadSettings(): Promise<void> {
      setIsLoading(true);
      setLoadError(null);
      try {
        const settings = await ensureStoreSettingsDoc();
        reset({
          storeName: settings.storeName,
          supportEmail: settings.supportEmail,
          defaultCurrency: settings.defaultCurrency,
          isStorefrontOpen: settings.isStorefrontOpen,
        });
      } catch (error) {
        setLoadError(describeFirestoreError(error, 'Could not load settings. Please refresh the page.'));
      } finally {
        setIsLoading(false);
      }
    }
    void loadSettings();
  }, [reset]);

  async function onSubmit(values: SettingsFormValues): Promise<void> {
    setFormError(null);
    setSavedMessage(false);
    try {
      await updateStoreSettings(values);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2500);
    } catch (error) {
      setFormError(describeFirestoreError(error, 'Could not save settings. Please try again.'));
    }
  }

  if (isLoading) {
    return <FullPageLoader label="Loading settings…" />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Store settings</h1>

        {loadError ? <FormBanner tone="error" message={loadError} /> : null}
        {formError ? <FormBanner tone="error" message={formError} /> : null}
        {savedMessage ? <FormBanner tone="success" message="Settings saved." /> : null}

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
          <FormField
            label="Store name"
            error={errors.storeName?.message}
            {...register('storeName', { required: 'Required' })}
          />
          <FormField
            label="Support email"
            type="email"
            error={errors.supportEmail?.message}
            {...register('supportEmail', { required: 'Required' })}
          />
          <FormField
            label="Default currency (ISO code)"
            error={errors.defaultCurrency?.message}
            {...register('defaultCurrency', { required: 'Required', maxLength: 3 })}
          />

          <label className={styles.checkboxRow}>
            <input type="checkbox" {...register('isStorefrontOpen')} />
            Storefront is open for new orders
          </label>

          <SubmitButton isSubmitting={isSubmitting} busyLabel="Saving…">
            Save settings
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
