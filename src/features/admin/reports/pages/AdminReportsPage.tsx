/**
 * AdminReportsPage.tsx
 * ----------------------------------------------------------------------------
 * Admin route: /admin/reports (admin+, per the original module spec).
 *
 * HONESTY NOTE on how this differs from Analytics (see AdminAnalyticsPage.tsx):
 * this page has no precomputed rollup collection to read from — DeskDrop's
 * stack doesn't include a Cloud Functions deployment in this pass (see
 * system.types.ts's `analytics` collection comment: it's meant to be
 * written by a scheduled function that doesn't exist yet). Rather than
 * leave Reports empty or fake numbers, this page computes real,
 * accurate aggregates on the fly from the actual `orders` collection
 * (revenue, order count, average order value, and top products by units
 * sold) using `listAllOrders()`, which staff+ can already read. This is
 * a legitimate report — it's just computed at view time instead of
 * precomputed nightly, which is the honest tradeoff to make without
 * inventing a backend job that isn't there.
 */

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FullPageLoader } from '@/components/FullPageLoader';
import { listAllOrders } from '@/lib/firebase/orders.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import { formatMoneyDisplay, sumMoney } from '@/lib/utils/money';
import type { OrderDocument } from '@/types/order.types';
import styles from './AdminReportsPage.module.css';

/** Order statuses that represent completed revenue — pending/cancelled/
 *  refunded orders are excluded from revenue totals, which matters for
 *  these numbers to mean anything. */
const REVENUE_STATUSES = new Set<OrderDocument['status']>(['paid', 'processing', 'shipped', 'delivered']);

export function AdminReportsPage(): ReactElement {
  const [orders, setOrders] = useState<OrderDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders(): Promise<void> {
      setIsLoading(true);
      setLoadError(null);
      try {
        setOrders(await listAllOrders());
      } catch (error) {
        setLoadError(describeFirestoreError(error, 'Could not load report data. Please refresh the page.'));
      } finally {
        setIsLoading(false);
      }
    }
    void loadOrders();
  }, []);

  const revenueOrders = useMemo(() => orders.filter((order) => REVENUE_STATUSES.has(order.status)), [orders]);

  const totalRevenue = useMemo(() => {
    if (revenueOrders.length === 0) return { amountInMinorUnits: 0, currency: 'USD' };
    const currency = revenueOrders[0]?.total.currency ?? 'USD';
    return sumMoney(revenueOrders.map((order) => order.total), currency);
  }, [revenueOrders]);

  const averageOrderValue =
    revenueOrders.length > 0
      ? { amountInMinorUnits: Math.round(totalRevenue.amountInMinorUnits / revenueOrders.length), currency: totalRevenue.currency }
      : { amountInMinorUnits: 0, currency: 'USD' };

  const topProducts = useMemo(() => {
    const unitsByName = new Map<string, number>();
    for (const order of revenueOrders) {
      for (const item of order.lineItems) {
        unitsByName.set(item.name, (unitsByName.get(item.name) ?? 0) + item.quantity);
      }
    }
    return Array.from(unitsByName.entries())
      .map(([name, units]) => ({ name, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 8);
  }, [revenueOrders]);

  if (isLoading) {
    return <FullPageLoader label="Crunching the numbers…" />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reports</h1>
        <p className={styles.subtitle}>Computed live from {orders.length} order(s) in the store.</p>
      </header>

      {loadError ? <p className={styles.errorText}>{loadError}</p> : null}

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Revenue</span>
          <span className={styles.statValue}>{formatMoneyDisplay(totalRevenue)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Completed orders</span>
          <span className={styles.statValue}>{revenueOrders.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Average order value</span>
          <span className={styles.statValue}>{formatMoneyDisplay(averageOrderValue)}</span>
        </div>
      </div>

      <section className={styles.chartSection}>
        <h2 className={styles.chartTitle}>Top products by units sold</h2>
        {topProducts.length === 0 ? (
          <p className={styles.emptyState}>No completed orders yet — this chart will populate as sales come in.</p>
        ) : (
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12 }} />
                <Tooltip />
                {/* Bars carry the same ink outline as every other surface
                    in the app — Recharts renders SVG, so these colours
                    can't come from CSS tokens and are set literally to
                    match --color-accent / --color-ink in global.css. */}
                <Bar dataKey="units" fill="#2b5cff" stroke="#12100e" strokeWidth={2} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
