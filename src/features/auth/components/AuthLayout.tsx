/**
 * AuthLayout.tsx
 * ----------------------------------------------------------------------------
 * Shared centered-card shell used by Login, Register, and Forgot Password
 * pages, so the three pages stay visually consistent without duplicating
 * layout markup. Purely presentational — takes a title, optional subtitle,
 * and renders its children (the actual form) inside a card.
 */

import type { ReactElement, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps): ReactElement {
  return (
    <div className={styles.page}>
      <div className={styles.brandBar}>
        <Link to="/" className={styles.brandLink}>
          DeskDrop
        </Link>
      </div>

      <motion.main
        className={styles.card}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        {children}
      </motion.main>
    </div>
  );
}
