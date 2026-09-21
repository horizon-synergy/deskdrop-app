/**
 * converters.ts
 * ----------------------------------------------------------------------------
 * Firestore's JS SDK is untyped by default — `getDoc(...).data()` returns
 * `DocumentData` (effectively `any`). A `FirestoreDataConverter` lets us
 * attach real TypeScript types to a collection reference once, so every
 * read/write through that reference is checked by the compiler from then on.
 *
 * `makeConverter` is a tiny factory for the common case where the document
 * shape stored in Firestore is identical to our TS interface (true for
 * every collection in this app, since our interfaces are modeled directly
 * on the Firestore schema). For collections that ever need bespoke
 * serialization, write a one-off converter instead of forcing it through
 * this helper.
 */

import type { FirestoreDataConverter, QueryDocumentSnapshot } from 'firebase/firestore';

export function makeConverter<T extends object>(): FirestoreDataConverter<T> {
  return {
    // Firestore document data maps directly onto our interface, so writes
    // pass through unchanged. `toFirestore` still exists as an explicit
    // seam — if a collection ever needs to strip a client-only field
    // before writing, this is the one place to do it.
    toFirestore(data: T) {
      return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      return snapshot.data() as T;
    },
  };
}
