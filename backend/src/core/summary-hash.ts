import { createHash } from 'node:crypto';

/**
 * Deterministic canonical serialization:
 * - object keys sorted lexicographically at every depth
 * - strings trimmed
 * - null and absent fields both serialize as null
 * - dates as ISO-8601 UTC strings
 * Same input always produces the same output.
 */
export function canonicalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => canonicalize(v));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = canonicalize((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return String(value);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export interface VersionStateEntry {
  _id: string;
  __v: number;
  updatedAt: string;
}

/**
 * summaryHash v1.1 inputs:
 * 1. normalized (canonical) payload
 * 2. category
 * 3. duplicate-detection state (all relevant dedupe field value sets)
 * 4-6. full version state (_id, __v, updatedAt) of matching documents
 * Any create/update/delete/duplicate/version change between preview and
 * confirm changes at least one input, so the hash differs and confirm
 * rejects with 409 data_changed.
 */
export function computeSummaryHash(
  category: string,
  normalizedPayload: unknown[],
  duplicateState: Record<string, string[]>,
  versionState: VersionStateEntry[]
): string {
  const sortedVersionState = [...versionState]
    .map((e) => ({ _id: e._id, __v: e.__v, updatedAt: e.updatedAt }))
    .sort((a, b) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0));
  const sortedDupState = Object.keys(duplicateState)
    .sort()
    .reduce<Record<string, string[]>>((acc, k) => {
      acc[k] = [...duplicateState[k]].sort();
      return acc;
    }, {});
  const material = {
    v: '1.1',
    category,
    payload: canonicalize(normalizedPayload),
    duplicateState: canonicalize(sortedDupState),
    versionState: canonicalize(sortedVersionState)
  };
  return createHash('sha256').update(JSON.stringify(material)).digest('hex');
}
