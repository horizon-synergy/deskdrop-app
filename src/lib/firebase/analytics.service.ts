/**
 * analytics.service.ts
 * ----------------------------------------------------------------------------
 * Reads from the `analytics` collection — precomputed daily rollups (see
 * DailySalesSummaryDocument in system.types.ts). Per that type's header
 * comment and firestore.rules (`allow write: if false` on this
 * collection), these documents are meant to be written by a scheduled
 * Cloud Function using the Admin SDK, which bypasses client rules
 * entirely. That function is NOT part of this pass — see
 * AdminAnalyticsPage.tsx for how the UI handles an honestly-empty
 * collection rather than pretending data exists.
 */

import { collection, getDocs, query, orderBy, limit as firestoreLimit, type CollectionReference } from 'firebase/firestore';
import { db } from './config';
import type { DailySalesSummaryDocument } from '@/types/system.types';

const analyticsCollection = collection(db, 'analytics') as CollectionReference<DailySalesSummaryDocument>;

/** Fetches the most recent N daily summaries, oldest first (chart-ready order). */
export async function listRecentDailySummaries(days: number = 30): Promise<DailySalesSummaryDocument[]> {
  const q = query(analyticsCollection, orderBy('date', 'desc'), firestoreLimit(days));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => docSnapshot.data() as DailySalesSummaryDocument).reverse();
}
