/**
 * OrdersPage.tsx
 * ----------------------------------------------------------------------------
 * Authenticated route: /orders
 *
 * Lists every order the signed-in user has placed (most recent first),
 * via orders.service.ts -> listOrdersForCustomer, which is scoped to
 * `customerId == request.auth.uid` at the Firestore rules level — this
 * page can never see another customer's orders even if it tried.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { FullPageLoader } from '@/components/FullPageLoader';
import { useAuth } from '@/hooks/useAuth';
import { listOrdersForCustomer } from '@/lib/firebase/orders.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import { formatMoneyDisplay } from '@/lib/utils/money';
import type { OrderDocument, OrderStatus } from '@/types/order.types';
import styles from './OrdersPage.module.css';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export function OrdersPage(): ReactElement {
  const { uid } = useAuth();
  const [orders, setOrders] = useState<OrderDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders(): Promise<void> {
      if (!uid) return;
      setIsLoading(true);
      setLoadError(null);
      try {
        const results = await listOrdersForCustomer(uid);
        setOrders(results);
      } catch (error) {
        setLoadError(describeFirestoreError(error, 'Could not load your orders. Please refresh the page.'));
      } finally {
        setIsLoading(false);
      }
    }
    void loadOrders();
  }, [uid]);

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.content}>
        <h1 className={styles.title}>Your orders</h1>

        {isLoading ? (
          <FullPageLoader label="Loading your orders…" />
        ) : loadError ? (
          <p className={styles.errorText}>{loadError}</p>
        ) : orders.length === 0 ? (
          <p className={styles.emptyState}>
            You haven&apos;t placed any orders yet.{' '}
            <Link to="/shop" className={styles.link}>
              Start shopping
            </Link>
            .
          </p>
        ) : (
          <ul className={styles.orderList}>
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.orderId;
              return (
                <li key={order.orderId} className={styles.orderCard}>
                  <button
                    type="button"
                    className={styles.orderSummary}
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <p className={styles.orderId}>Order #{order.orderId.slice(0, 8).toUpperCase()}</p>
                      <p className={styles.orderMeta}>
                        {order.lineItems.length} item{order.lineItems.length === 1 ? '' : 's'} ·{' '}
                        {formatMoneyDisplay(order.total)}
                      </p>
                    </div>
                    <span className={styles[`status_${order.status}`]}>{STATUS_LABELS[order.status]}</span>
                  </button>

                  {isExpanded ? (
                    <div className={styles.orderDetails}>
                      <ul className={styles.lineItemList}>
                        {order.lineItems.map((item) => (
                          <li key={`${item.productId}_${item.variantId}`} className={styles.lineItem}>
                            <img src={item.imageUrl} alt="" className={styles.lineItemImage} />
                            <div className={styles.lineItemDetails}>
                              <p className={styles.lineItemName}>{item.name}</p>
                              <p className={styles.lineItemMeta}>Qty {item.quantity}</p>
                            </div>
                            <span>{formatMoneyDisplay(item.lineTotal)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className={styles.totalsBlock}>
                        <div className={styles.totalsRow}>
                          <span>Subtotal</span>
                          <span>{formatMoneyDisplay(order.subtotal)}</span>
                        </div>
                        <div className={styles.totalsRow}>
                          <span>Shipping</span>
                          <span>{formatMoneyDisplay(order.shippingCost)}</span>
                        </div>
                        <div className={styles.totalsRowBold}>
                          <span>Total</span>
                          <span>{formatMoneyDisplay(order.total)}</span>
                        </div>
                      </div>
                      <div className={styles.addressBlock}>
                        <span className={styles.addressLabel}>Shipping to</span>
                        <p>
                          {order.shippingAddress.fullName}
                          <br />
                          {order.shippingAddress.line1}
                          {order.shippingAddress.line2 ? <>, {order.shippingAddress.line2}</> : null}
                          <br />
                          {order.shippingAddress.city}, {order.shippingAddress.region}{' '}
                          {order.shippingAddress.postalCode}
                          <br />
                          {order.shippingAddress.country}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
