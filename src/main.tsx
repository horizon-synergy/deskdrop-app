/**
 * main.tsx
 * ----------------------------------------------------------------------------
 * Vite/React entry point. Mounts <App> into #root (see index.html) inside
 * React's StrictMode, which helps surface unsafe lifecycle patterns during
 * development by intentionally double-invoking certain functions — it has
 * no effect on the production build.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element "#root" was not found in index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
