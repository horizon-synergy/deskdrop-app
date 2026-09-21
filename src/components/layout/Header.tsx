/**
 * Header.tsx
 * ----------------------------------------------------------------------------
 * Shared top navigation used across the public/customer-facing pages
 * (Shop, Product Details, Wishlist, Checkout, Orders). Not used on admin
 * pages, which have their own layout. Owns opening the CartDrawer via
 * local state — the drawer itself is a sibling component rendered here
 * so the cart icon and its contents live together.
 */

import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBagIcon, HeartIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { useCartItemCount } from '@/store/cartStore';
import { CartDrawer } from './CartDrawer';
import styles from './Header.module.css';

export function Header(): ReactElement {
  const { isAuthenticated } = useAuth();
  const { isAdminAreaUser } = usePermission();
  const itemCount = useCartItemCount();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand}>
            DeskDrop
          </Link>

          <nav className={styles.nav}>
            <Link to="/shop" className={styles.navLink}>
              Shop
            </Link>

            {isAdminAreaUser ? (
              <Link to="/admin" className={styles.adminLink}>
                Admin
              </Link>
            ) : null}

            {isAuthenticated ? (
              <Link to="/wishlist" className={styles.iconLink} aria-label="Wishlist">
                <HeartIcon width={20} height={20} />
              </Link>
            ) : null}

            <button
              type="button"
              className={styles.cartButton}
              onClick={() => setIsCartOpen(true)}
              aria-label={`Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`}
            >
              <ShoppingBagIcon width={20} height={20} />
              {itemCount > 0 ? <span className={styles.cartBadge}>{itemCount}</span> : null}
            </button>

            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              className={styles.iconLink}
              aria-label={isAuthenticated ? 'Your account' : 'Sign in'}
            >
              <UserCircleIcon width={22} height={22} />
            </Link>
          </nav>
        </div>
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
