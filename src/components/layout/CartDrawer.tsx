/**
 * CartDrawer.tsx
 * ----------------------------------------------------------------------------
 * The cart's UI surface (see store/cartStore.ts for why cart state itself
 * isn't a Firestore collection). A slide-over panel rather than a full
 * page/route, matching the route spec — Cart isn't in the app's public or
 * authenticated route list; Checkout is, and Checkout is where the cart's
 * contents get turned into a real order.
 */

import type { ReactElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { XMarkIcon, MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useCartItems, useCartSubtotal, useCartStore } from '@/store/cartStore';
import { formatMoneyDisplay } from '@/lib/utils/money';
import styles from './CartDrawer.module.css';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps): ReactElement | null {
  const items = useCartItems();
  const subtotal = useCartSubtotal();
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className={styles.drawer}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            aria-label="Shopping cart"
          >
            <div className={styles.header}>
              <h2 className={styles.title}>Your cart</h2>
              <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close cart">
                <XMarkIcon width={18} height={18} />
              </button>
            </div>

            {items.length === 0 ? (
              <p className={styles.emptyState}>Your cart is empty.</p>
            ) : (
              <>
                <ul className={styles.itemList}>
                  {items.map((item) => (
                    <li key={`${item.productId}_${item.variantId}`} className={styles.item}>
                      <img src={item.imageUrl} alt="" className={styles.itemImage} />
                      <div className={styles.itemDetails}>
                        <p className={styles.itemName}>{item.name}</p>
                        <p className={styles.itemPrice}>{formatMoneyDisplay(item.unitPrice)}</p>
                        <div className={styles.quantityRow}>
                          <button
                            type="button"
                            className={styles.quantityButton}
                            onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            <MinusIcon width={12} height={12} />
                          </button>
                          <span className={styles.quantityValue}>{item.quantity}</span>
                          <button
                            type="button"
                            className={styles.quantityButton}
                            onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <PlusIcon width={12} height={12} />
                          </button>
                          <button
                            type="button"
                            className={styles.removeButton}
                            onClick={() => removeItem(item.productId, item.variantId)}
                            aria-label="Remove item"
                          >
                            <TrashIcon width={14} height={14} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className={styles.footer}>
                  <div className={styles.subtotalRow}>
                    <span>Subtotal</span>
                    <span>{formatMoneyDisplay(subtotal)}</span>
                  </div>
                  <p className={styles.shippingNote}>Shipping and taxes calculated at checkout.</p>
                  <Link to="/checkout" className={styles.checkoutButton} onClick={onClose}>
                    Checkout
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
