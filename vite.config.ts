import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Vite build configuration.
// - @vitejs/plugin-react gives us Fast Refresh + JSX transform.
// - The `@` alias mirrors the `paths` entry in tsconfig.json so imports
//   like `@/lib/firebase/config` resolve identically for the TypeScript
//   compiler and the Vite dev/build pipeline.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
