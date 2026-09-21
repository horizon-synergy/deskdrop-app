/**
 * settings.service.ts
 * ----------------------------------------------------------------------------
 * All Firestore access to the `settings` collection. This pass models a
 * single singleton document, `settings/store`, holding store-wide
 * configuration (see StoreSettingsDocument in system.types.ts). Reads are
 * public (the storefront needs `isStorefrontOpen` before any sign-in —
 * see firestore.rules), writes are admin+.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import type { StoreSettingsDocument } from '@/types/system.types';

const STORE_SETTINGS_DOC_ID = 'store';

const DEFAULT_SETTINGS: Omit<StoreSettingsDocument, 'createdAt' | 'updatedAt'> = {
  storeName: 'DeskDrop',
  supportEmail: 'support@deskdrop.example',
  defaultCurrency: 'USD',
  isStorefrontOpen: true,
};

/**
 * Fetches the store settings document. If it doesn't exist yet (e.g. a
 * freshly-initialized Firebase project before an admin has ever saved
 * settings), returns in-memory defaults WITHOUT writing them — this
 * function is called from the public storefront (to check
 * `isStorefrontOpen` before sign-in), and a write attempt from a
 * non-admin caller would simply fail under firestore.rules anyway. Use
 * `ensureStoreSettingsDoc` (admin-only call site) to actually persist the
 * seed document.
 */
export async function getStoreSettings(): Promise<StoreSettingsDocument> {
  const ref = doc(db, 'settings', STORE_SETTINGS_DOC_ID);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return snapshot.data() as StoreSettingsDocument;
  }
  return {
    ...DEFAULT_SETTINGS,
    createdAt: serverTimestamp() as unknown as StoreSettingsDocument['createdAt'],
    updatedAt: serverTimestamp() as unknown as StoreSettingsDocument['updatedAt'],
  };
}

/**
 * Persists the default settings document if one doesn't exist yet. Only
 * ever called from AdminSettingsPage (behind admin+ route guards), since
 * the underlying write requires admin+ per firestore.rules.
 */
export async function ensureStoreSettingsDoc(): Promise<StoreSettingsDocument> {
  const ref = doc(db, 'settings', STORE_SETTINGS_DOC_ID);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return snapshot.data() as StoreSettingsDocument;
  }
  const seeded: StoreSettingsDocument = {
    ...DEFAULT_SETTINGS,
    createdAt: serverTimestamp() as unknown as StoreSettingsDocument['createdAt'],
    updatedAt: serverTimestamp() as unknown as StoreSettingsDocument['updatedAt'],
  };
  await setDoc(ref, seeded);
  return seeded;
}

export async function updateStoreSettings(
  input: Partial<Omit<StoreSettingsDocument, 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  const ref = doc(db, 'settings', STORE_SETTINGS_DOC_ID);
  await setDoc(ref, { ...input, updatedAt: serverTimestamp() }, { merge: true });
}
