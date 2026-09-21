/**
 * ConfirmDialog.tsx
 * ----------------------------------------------------------------------------
 * A small, accessible modal used before destructive/irreversible admin
 * actions (archiving a product, deleting a category). Rendered
 * conditionally by the parent (`isOpen`) rather than managing its own
 * open state, so the parent stays in full control of what action is
 * being confirmed. Traps focus loosely via autoFocus on the confirm
 * button and closes on Escape or backdrop click for keyboard/mouse users
 * alike.
 */

import { useEffect, type ReactElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactElement | null {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className={styles.title}>
              {title}
            </h2>
            <p className={styles.message}>{message}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.cancelButton} onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className={tone === 'danger' ? styles.confirmButtonDanger : styles.confirmButton}
                onClick={onConfirm}
                autoFocus
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
