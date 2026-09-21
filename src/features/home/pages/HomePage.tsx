/**
 * HomePage.tsx
 * ----------------------------------------------------------------------------
 * Public route: /
 *
 * The storefront landing page. This pass ships the real hero/brand section
 * and navigation entry points; the featured-products rail that will live
 * below the fold reads from the `products` collection and belongs to the
 * Shop feature module (not yet built — see README roadmap), so it is
 * intentionally not included here rather than being backed by fake
 * product data.
 */

import type { ReactElement } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import styles from './HomePage.module.css';

export function HomePage(): ReactElement {
  return (
    <div className={styles.page}>
      <Header />

      <motion.section
        className={styles.hero}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <h1 className={styles.heroTitle}>Thoughtfully sourced stationery, delivered.</h1>
        <p className={styles.heroSubtitle}>
          DeskDrop carefully sources and stocks every product we sell — notebooks, pens, and desk
          essentials from suppliers we trust, held and shipped by us.
        </p>
        <Link to="/shop" className={styles.heroCta}>
          Shop now
        </Link>
      </motion.section>
    </div>
  );
}
