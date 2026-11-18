import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok, fail } from '../../core/response';
import { PERMISSIONS } from '../../core/permissions';
import * as svc from './results.service';
import { checkQuerySchema, driveFolderBodySchema, driveKeyBodySchema, historyQuerySchema, importBodySchema, jobIdParamSchema, parseUrlBodySchema, type CheckQuery, type DriveFolderBody, type DriveKeyBody, type HistoryQuery, type ImportBody, type JobIdParam, type ParseUrlBody } from './results.schemas';

type Validated<T> = { validatedQuery?: T; validatedBody?: T };

const checkRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many result checks, try again later' } }
});

async function proxyJson(env: Env, path: string, init: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(`${env.RESULT_SERVICE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${env.RESULT_SERVICE_TOKEN}` }
  });
  return { status: res.status, body: await res.text() };
}

export function resultsRoutes(env: Env) {
  const router = Router();

  router.get('/meta', requireAuth(env.JWT_ACCESS_SECRET), async (_req, res, next) => {
    try {
      return ok(res, { exams: await svc.listResultExams(env) });
    } catch (err) { next(err); }
  });

  router.get('/check', requireAuth(env.JWT_ACCESS_SECRET), checkRateLimit, validate({ query: checkQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as Validated<CheckQuery>).validatedQuery!;
      return ok(res, await svc.checkResult(env, query.examId, query.roll));
    } catch (err) { next(err); }
  });

  router.get('/history', requireAuth(env.JWT_ACCESS_SECRET), checkRateLimit, validate({ query: historyQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as Validated<HistoryQuery>).validatedQuery!;
      return ok(res, { records: await svc.resultHistory(env, query.roll) });
    } catch (err) { next(err); }
  });

  router.get('/admin/parse-job/:jobId', async (req, res, next) => {
    try {
      if (!env.RESULT_SERVICE_URL || !env.RESULT_SERVICE_TOKEN) {
        return fail(res, 503, 'SERVICE_UNAVAILABLE', 'Result service is not configured');
      }
      const parsed = jobIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return fail(res, 400, 'VALIDATION_ERROR', 'Invalid job id');
      }
      const { status, body } = await proxyJson(env, `/parse/job/${(req.params as JobIdParam).jobId}`, { method: 'GET' });
      return res.status(status).set('content-type', 'application/json').send(body);
    } catch (err) { next(err); }
  });

  router.get('/admin/import-progress/:batchId', async (req, res, next) => {
    try {
      if (!env.RESULT_SERVICE_URL || !env.RESULT_SERVICE_TOKEN) {
        return fail(res, 503, 'SERVICE_UNAVAILABLE', 'Result service is not configured');
      }
      const batchId = String(req.params.batchId ?? '');
      if (!/^[a-f0-9]{24}$/.test(batchId)) {
        return fail(res, 400, 'VALIDATION_ERROR', 'Invalid batch id');
      }
      const { status, body } = await proxyJson(env, `/import/${batchId}/progress`, { method: 'GET' });
      return res.status(status).set('content-type', 'application/json').send(body);
    } catch (err) { next(err); }
  });

  router.use('/admin', requireAuth(env.JWT_ACCESS_SECRET), requirePermission(PERMISSIONS.CONTENT_MANAGE));

  router.get('/admin/batches', async (_req, res, next) => {
    try {
      if (!env.RESULT_SERVICE_URL || !env.RESULT_SERVICE_TOKEN) {
        return fail(res, 503, 'SERVICE_UNAVAILABLE', 'Result service is not configured');
      }
      const { status, body } = await proxyJson(env, '/batches', { method: 'GET' });
      return res.status(status).set('content-type', 'application/json').send(body);
    } catch (err) { next(err); }
  });

  router.post(
    '/admin/parse',
    express.raw({ type: 'multipart/form-data', limit: '55mb' }),
    async (req, res, next) => {
      try {
        if (!env.RESULT_SERVICE_URL || !env.RESULT_SERVICE_TOKEN) {
          return fail(res, 503, 'SERVICE_UNAVAILABLE', 'Result service is not configured');
        }
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.startsWith('multipart/form-data')) {
          return fail(res, 400, 'VALIDATION_ERROR', 'A multipart/form-data PDF upload is required');
        }
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return fail(res, 400, 'VALIDATION_ERROR', 'PDF file body is empty');
        }
        const { status, body } = await proxyJson(env, '/parse', {
          method: 'POST',
          headers: { 'content-type': contentType },
          body: new Uint8Array(req.body)
        });
        return res.status(status).set('content-type', 'application/json').send(body);
      } catch (err) { next(err); }
    }
  );

  router.post(
    '/admin/parse-job',
    express.raw({ type: 'multipart/form-data', limit: '55mb' }),
    async (req, res, next) => {
      try {
        if (!env.RESULT_SERVICE_URL || !env.RESULT_SERVICE_TOKEN) {
          return fail(res, 503, 'SERVICE_UNAVAILABLE', 'Result service is not configured');
        }
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.startsWith('multipart/form-data')) {
          return fail(res, 400, 'VALIDATION_ERROR', 'A multipart/form-data PDF upload is required');
        }
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return fail(res, 400, 'VALIDATION_ERROR', 'PDF file body is empty');
        }
        const { status, body } = await proxyJson(env, '/parse/job', {
          method: 'POST',
          headers: { 'content-type': contentType },
          body: new Uint8Array(req.body)
        });
        return res.status(status).set('content-type', 'application/json').send(body);
      } catch (err) { next(err); }
    }
  );

  router.post(
    '/admin/parse-url',
    express.json({ limit: '16kb' }),
    validate({ body: parseUrlBodySchema }),
    async (req, res, next) => {
      try {
        if (!env.RESULT_SERVICE_URL || !env.RESULT_SERVICE_TOKEN) {
          return fail(res, 503, 'SERVICE_UNAVAILABLE', 'Result service is not configured');
        }
        const body = req.body as ParseUrlBody;
        const { status, body: upstream } = await proxyJson(env, '/parse/url/job', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: body.url, examId: body.examId ?? '', title: body.title ?? '' })
        });
        return res.status(status).set('content-type', 'application/json').send(upstream);
      } catch (err) { next(err); }
    }
  );

  router.get('/admin/drive-key', async (req, res, next) => {
    try {
      const key = await svc.loadDriveApiKey(env);
      return ok(res, { configured: Boolean(key), keyMasked: svc.maskKey(key) });
    } catch (err) { next(err); }
  });

  router.put('/admin/drive-key', validate({ body: driveKeyBodySchema }), async (req, res, next) => {
    try {
      const body = req.body as DriveKeyBody;
      await svc.setDriveKey(req.auth!.id, body.apiKey ?? null, req.ip);
      const key = body.apiKey ?? '';
      return ok(res, { configured: Boolean(key), keyMasked: svc.maskKey(key) });
    } catch (err) { next(err); }
  });

  router.post('/admin/parse-drive', validate({ body: driveFolderBodySchema }), async (req, res, next) => {
    try {
      if (!env.RESULT_SERVICE_URL || !env.RESULT_SERVICE_TOKEN) {
        return fail(res, 503, 'SERVICE_UNAVAILABLE', 'Result service is not configured');
      }
      const apiKey = await svc.loadDriveApiKey(env);
      if (!apiKey) {
        return fail(res, 400, 'VALIDATION_ERROR', 'Google Drive API key is not set — save it in Settings first');
      }
      const body = req.body as DriveFolderBody;
      const { status, body: upstream } = await proxyJson(env, '/parse/drive/job', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ folderUrl: body.folderUrl, apiKey })
      });
      return res.status(status).set('content-type', 'application/json').send(upstream);
    } catch (err) { next(err); }
  });

  router.post('/admin/import', validate({ body: importBodySchema }), async (req, res, next) => {
    try {
      if (!env.RESULT_SERVICE_URL || !env.RESULT_SERVICE_TOKEN) {
        return fail(res, 503, 'SERVICE_UNAVAILABLE', 'Result service is not configured');
      }
      const body = req.body as ImportBody;
      const { status, body: upstream } = await proxyJson(env, `/import/${body.batchId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ meta: { examId: body.examId, ...(body.title ? { title: body.title } : {}) } })
      });
      if (status >= 200 && status < 300) {
        let parsed: { total?: number; inserted?: number; updated?: number } = {};
        try { parsed = JSON.parse(upstream); } catch { /* upstream body already forwarded below */ }
        await svc.auditResultImport(req.auth!.id, {
          batchId: body.batchId,
          examId: body.examId,
          total: parsed.total,
          inserted: parsed.inserted,
          updated: parsed.updated
        }, req.ip);
      }
      return res.status(status).set('content-type', 'application/json').send(upstream);
    } catch (err) { next(err); }
  });

  return router;
}
