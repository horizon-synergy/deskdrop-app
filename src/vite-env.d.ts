/// <reference types="vite/client" />

/**
 * vite-env.d.ts
 * ----------------------------------------------------------------------------
 * Extends Vite's built-in ImportMetaEnv typing with the specific
 * VITE_-prefixed variables this app requires (see .env.example). This is
 * what gives us compile-time checking / autocomplete on
 * `import.meta.env.VITE_FIREBASE_API_KEY` etc. in config.ts.
 */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME: string;
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
