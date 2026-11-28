type UpdateSpec = Record<string, unknown>;

/**
 * Adds an explicit "__v" increment to query-based content updates.
 *
 * Mongoose only auto-increments the version key on save() when
 * `optimisticConcurrency` is enabled (or when array versioning is needed);
 * findOneAndUpdate / updateOne / updateMany / bulkWrite never bump "__v".
 * Every content write that goes through a query update must use this helper
 * so version-conditional restore/rollback in import recovery stays reliable.
 *
 * Also strips any "__v" from $set/$unset so a caller can never overwrite the
 * version key directly.
 */
export function withVersionBump<T extends UpdateSpec>(update: T): T {
  const out: Record<string, unknown> = { ...update };
  for (const op of ['$set', '$unset'] as const) {
    if (out[op] && typeof out[op] === 'object' && !Array.isArray(out[op])) {
      const { __v: _stripped, ...rest } = out[op] as Record<string, unknown>;
      out[op] = rest;
    }
  }
  const existing = (out.$inc && typeof out.$inc === 'object' && !Array.isArray(out.$inc)
    ? (out.$inc as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  if (!('__v' in existing)) {
    out.$inc = { ...existing, __v: 1 };
  }
  return out as T;
}
