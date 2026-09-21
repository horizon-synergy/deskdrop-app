/**
 * AdminAnalyticsPage.tsx
 * ----------------------------------------------------------------------------
 * Admin route: /admin/analytics (admin+ — matching firestore.rules'
 * `analytics` read rule).
 *
 * Reads real documents from the `analytics` collection via
 * analytics.service.ts. On a fresh DeskDrop deployment this collection is
 * genuinely empty — no Cloud Function writes to it yet (see that file's
 * header comment) — and this page says so plainly instead of inventing
 * numbers or silently rendering a blank chart. Once a scheduled rollup
 * function is deployed and starts writing `analytics/{date}` documents,
 * this same page and query render the real trend with no further changes
 * needed. For revenue reporting that works TODAY without that function,
 * see /admin/reports, which computes live aggregates from `orders`.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { FullPageLoader } from '@/components/FullPageLoader';
import { listRecentDailySummaries } from '@/lib/firebase/analytics.service';
import { describeFirestoreError } from '@/lib/firebase/errors';
import type { DailySalesSummaryDocument } from '@/types/system.types';
import styles from './AdminAnalyticsPage.module.css';

export function AdminAnalyticsPage(): ReactElement {
  const [summaries, setSummaries] = useState<DailySalesSummaryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummaries(): Promise<void> {
      setIsLoading(true);
      setLoadError(null);
      try {
        setSummaries(await listRecentDailySummaries(30));
      } catch (error) {
        setLoadError(describeFirestoreError(error, 'Could not load analytics data. Please refresh the page.'));
      } finally {
        setIsLoading(false);
      }
    }
    void loadSummaries();
  }, []);

  if (isLoading) {
    return <FullPageLoader label="Loading analytics…" />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
        <p className={styles.subtitle}>Trends from precomputed daily rollups.</p>
      </header>

      {loadError ? <p className={styles.errorText}>{loadError}</p> : null}

      {summaries.length === 0 && !loadError ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No rollup data yet</p>
          <p className={styles.emptyBody}>
            This dashboard reads from the <code>analytics</code> collection, which is written by a scheduled
            backend job that hasn&apos;t been deployed in this build. Once that job starts writing daily summaries,
            this page will chart them automatically — no code changes needed.
          </p>
          <Link to="/admin/reports" className={styles.emptyLink}>
            See live revenue reporting in Reports →
          </Link>
        </div>
      ) : (
        <section className={styles.chartSection}>
          <h2 className={styles.chartTitle}>Revenue, last {summaries.length} days</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={summaries.map((s) => ({ ...s, revenue: s.revenueInMinorUnits / 100 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              {/* Literal colour matching --color-accent in global.css —
                  Recharts renders SVG and can't read CSS custom
                  properties. Stroke is heavier than the Recharts default
                  to sit alongside this system's 2px borders. */}
              <Line type="monotone" dataKey="revenue" stroke="#2b5cff" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}
