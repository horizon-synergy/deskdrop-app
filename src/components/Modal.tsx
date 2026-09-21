/**
 * Modal.tsx
 * ----------------------------------------------------------------------------
 * Generic modal shell (backdrop + centered panel + close button) used to
 * host create/edit forms in the admin area (CategoryForm, and future
 * ProductForm-in-modal use cases). Distinct from ConfirmDialog.tsx, which
 * is purpose-built for short yes/no confirmations — this one is sized for
 * arbitrary form content and scrolls internally if the form is tall.
 */

import type { ReactElement, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ isOpen, title, onClose, children }: ModalProps): ReactElement | null {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h2 id="modal-title" className={styles.title}>
                {title}
              </h2>
              <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
                <XMarkIcon width={18} height={18} />
              </button>
            </div>
            <div className={styles.body}>{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
