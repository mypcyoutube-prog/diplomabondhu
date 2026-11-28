import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../core/errors';
import { fail } from '../core/response';
import { logger } from '../core/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return fail(res, err.status, err.code, err.message, err.details);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return fail(res, 400, 'VALIDATION_ERROR', 'Database validation failed', details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return fail(res, 400, 'VALIDATION_ERROR', `Invalid value for ${err.path}`);
  }

  if (err instanceof mongoose.Error.VersionError) {
    return fail(res, 409, 'CONFLICT', 'Document was modified by someone else; reload and retry');
  }

  const mongoDuplicate = err as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoDuplicate?.code === 11000) {
    const field = Object.keys(mongoDuplicate.keyValue ?? {}).join(', ') || 'field';
    return fail(res, 409, 'CONFLICT', `Duplicate value for ${field}`);
  }

  logger.error('Unhandled error', {
    path: req.path,
    method: req.method,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined
  });

  return fail(res, 500, 'INTERNAL', 'An unexpected error occurred');
}

export function notFoundHandler(req: Request, res: Response) {
  return fail(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}
