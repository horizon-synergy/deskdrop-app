/**
 * AdminOrdersPage.tsx
 * ----------------------------------------------------------------------------
 * Admin route: /admin/orders (staff+ — base admin-area minimum, matching
 * firestore.rules' `orders` read/update rule for staff+).
 *
 * Lists every order (listAllOrders — distinct from the customer-facing
 * OrdersPage, which scopes to the signed-in customer's own orders), with
 * status filtering and a per-order status-update control. Every status
 * change is real: it calls orders.service.ts -> updateOrderStatus, which
 * appends an auditable entry to the order's statusHistory.
 */

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { FullPageLoader } from '@/components/FullPageLoader';
import { useAuth } from '@/hooks/useAuth';
import { listAllOrders, updateOrderStatus } from '@/lib/firebase/orders.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import { formatMoneyDisplay } from '@/lib/utils/money';
import type { OrderDocument, OrderStatus } from '@/types/order.types';
import styles from './AdminOrdersPage.module.css';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

/** Valid forward transitions a staff member can move an order into from
 *  each current status — deliberately excludes nonsensical jumps (e.g.
 *  'pending_payment' straight to 'delivered') at the UI layer. Firestore
 *  rules don't enforce this specific state machine (any staff+ write to
 *  `orders` is allowed), so this is an application-layer safeguard, not
 *  a security boundary. */
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['processing', 'refunded'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

const STATUS_FILTERS: Array<OrderStatus | 'all'> = [
  'all',
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export function AdminOrdersPage(): ReactElement {
  const { uid } = useAuth();
  const [orders, setOrders] = useState<OrderDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadOrders(): Promise<void> {
    setIsLoading(true);
    setLoadError(null);
    try {
      const results = await listAllOrders();
      setOrders(results);
    } catch (error) {
      setLoadError(describeFirestoreError(error, 'Could not load orders. Please refresh the page.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  const visibleOrders = useMemo(
    () => (statusFilter === 'all' ? orders : orders.filter((order) => order.status === statusFilter)),
    [orders, statusFilter],
  );

  async function handleStatusChange(order: OrderDocument, nextStatus: OrderStatus): Promise<void> {
    if (!uid) return;
    setActionError(null);
    setUpdatingOrderId(order.orderId);
    try {
      await updateOrderStatus(order.orderId, nextStatus, uid);
      await loadOrders();
    } catch (error) {
      setActionError(describeFirestoreError(error, 'Could not update this order. Please try again.'));
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (isLoading) {
    return <FullPageLoader label="Loading orders…" />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Orders</h1>
        <p className={styles.subtitle}>Fulfillment and order status management.</p>
      </header>

      <div className={styles.filterGroup}>
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className={statusFilter === status ? styles.filterButtonActive : styles.filterButton}
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'All' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {loadError ? <p className={styles.errorText}>{loadError}</p> : null}
      {actionError ? <p className={styles.errorText}>{actionError}</p> : null}

      {visibleOrders.length === 0 && !loadError ? (
        <p className={styles.emptyState}>No orders match this filter.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => {
              const nextOptions = NEXT_STATUSES[order.status];
              return (
                <tr key={order.orderId}>
                  <td className={styles.mutedCell}>#{order.orderId.slice(0, 8).toUpperCase()}</td>
                  <td>{order.customerEmail}</td>
                  <td className={styles.mutedCell}>{order.lineItems.length}</td>
                  <td className={styles.mutedCell}>{formatMoneyDisplay(order.total)}</td>
                  <td>
                    <span className={styles[`status_${order.status}`]}>{STATUS_LABELS[order.status]}</span>
                  </td>
                  <td className={styles.actionsCell}>
                    {nextOptions.length > 0 ? (
                      <select
                        className={styles.statusSelect}
                        value=""
                        disabled={updatingOrderId === order.orderId}
                        onChange={(e) => {
                          if (e.target.value) void handleStatusChange(order, e.target.value as OrderStatus);
                        }}
                      >
                        <option value="" disabled>
                          {updatingOrderId === order.orderId ? 'Updating…' : 'Move to…'}
                        </option>
                        {nextOptions.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={styles.mutedCell}>Final</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
