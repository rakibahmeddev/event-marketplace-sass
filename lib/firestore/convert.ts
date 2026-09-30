import { Timestamp } from 'firebase-admin/firestore';

/** Recursively turns Firestore Timestamps into Dates so Zod schemas can use z.date(). */
export function fromFirestore(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(fromFirestore);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fromFirestore(v)]));
  }
  return value;
}
