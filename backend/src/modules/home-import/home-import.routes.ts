import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { PERMISSIONS } from '../../core/permissions';
import * as svc from './home-import.service';
import {
  batchIdParam, exportQuerySchema, historyQuerySchema, importPreviewSchema, previewTokenSchema
} from './home-import.schemas';

const importRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many import requests. Try again later.' } }
});

export function homeImportAdminRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET), requirePermission(PERMISSIONS.CONTENT_MANAGE));

  router.post('/import/preview', importRateLimit, validate({ body: importPreviewSchema }), async (req, res, next) => {
    try {
      const body = (req as unknown as { body: { category: 'banners' | 'quick_access' | 'study_resources' | 'upcoming_exams' | 'admin_notices' | 'home_config'; items: Record<string, unknown>[] } }).body;
      const result = await svc.previewImport(env, body.category, body.items, req.auth!.id);
      return ok(res, result);
    } catch (err) { next(err); }
  });

  router.post('/import/confirm', importRateLimit, validate({ body: previewTokenSchema }), async (req, res, next) => {
    try {
      const body = (req as unknown as { body: { token: string } }).body;
      const outcome = await svc.confirmImport(env, body.token, req.auth!.id);
      if (outcome.inProgress) return ok(res, { status: 'processing', batchId: outcome.batchId }, 202);
      return ok(res, { status: outcome.status, batchId: outcome.batchId, report: outcome.report });
    } catch (err) { next(err); }
  });

  router.get('/import/history', requirePermission(PERMISSIONS.AUDIT_READ), validate({ query: historyQuerySchema }), async (req, res, next) => {
    try {
      const q = (req as unknown as { validatedQuery: { page: number; limit: number } }).validatedQuery;
      const result = await svc.listHistory(q.page, q.limit);
      return ok(res, result);
    } catch (err) { next(err); }
  });

  router.get('/import/history/:batchId', requirePermission(PERMISSIONS.AUDIT_READ), validate({ params: batchIdParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { batchId: string } }).validatedParams;
      const history = await svc.getHistory(params.batchId);
      return ok(res, history);
    } catch (err) { next(err); }
  });

  router.get('/import/export', validate({ query: exportQuerySchema }), async (req, res, next) => {
    try {
      const q = (req as unknown as { validatedQuery: { category: 'banners' | 'quick_access' | 'study_resources' | 'upcoming_exams' | 'admin_notices' | 'home_config' } }).validatedQuery;
      const result = await svc.exportCategory(q.category);
      return ok(res, result);
    } catch (err) { next(err); }
  });

  router.post('/import/rollback/:batchId', importRateLimit, validate({ params: batchIdParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { batchId: string } }).validatedParams;
      const report = await svc.rollbackImport(params.batchId, req.auth!.id);
      return ok(res, report);
    } catch (err) { next(err); }
  });

  return router;
}

export function homeRecoveryAdminRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET), requirePermission(PERMISSIONS.CONTENT_MANAGE));

  router.get('/recovery', async (_req, res, next) => {
    try {
      const result = await svc.listRecovery();
      return ok(res, result);
    } catch (err) { next(err); }
  });

  router.post('/recovery/:batchId/resolve', importRateLimit, validate({ params: batchIdParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { batchId: string } }).validatedParams;
      const report = await svc.resolveRecovery(params.batchId, req.auth!.id);
      return ok(res, report);
    } catch (err) { next(err); }
  });

  return router;
}
