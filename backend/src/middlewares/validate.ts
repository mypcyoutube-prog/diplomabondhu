import type { NextFunction, Request, Response } from 'express';
import { z, ZodSchema } from 'zod';
import { validationError } from '../core/errors';

const NOSQL_PATTERNS = [/\$where/, /\$ne\b/, /\$gt\b/, /\$regex\b/, /\$function\b/];

export function stripNoSqlOperators(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNoSqlOperators);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k.startsWith('$')) continue;
      out[k] = stripNoSqlOperators(v);
    }
    return out;
  }
  if (typeof value === 'string' && NOSQL_PATTERNS.some((p) => p.test(value))) {
    return value.replace(/\$[a-zA-Z]+/g, '');
  }
  return value;
}

type Schemas = { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema };

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(stripNoSqlOperators(req.body ?? {}));
      }
      if (schemas.query) {
        (req as Request & { validatedQuery?: unknown }).validatedQuery =
          schemas.query.parse(stripNoSqlOperators(req.query ?? {}));
      }
      if (schemas.params) {
        (req as Request & { validatedParams?: unknown }).validatedParams =
          schemas.params.parse(stripNoSqlOperators(req.params ?? {}));
      }
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(validationError('Request validation failed',
          err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))));
      }
      next(err);
    }
  };
}
