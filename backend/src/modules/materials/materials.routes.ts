import { Router } from 'express';
import type { Env } from '../../config/env';
import { optionalAuth, requireAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { PERMISSIONS } from '../../core/permissions';
import * as svc from './materials.service';
import {
  adminListQuerySchema, idParam, listMaterialsQuerySchema, listReportsQuerySchema,
  materialBodySchema, reportSchema, resolveReportSchema, updateMaterialSchema
} from './materials.schemas';

type Validated<T> = { validatedQuery?: T; validatedParams?: T };

export function materialsRoutes(env: Env) {
  const router = Router();

  router.get('/', validate({ query: listMaterialsQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as Validated<svc.ListMaterialsOptions>).validatedQuery!;
      const { items, meta } = await svc.listMaterials(query);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  router.get('/recent', requireAuth(env.JWT_ACCESS_SECRET), async (req, res, next) => {
    try {
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
      const { items, viewedAtById } = await svc.listRecent(req.auth!.id, limit);
      return ok(res, { items, viewedAtById });
    } catch (err) { next(err); }
  });

  router.get('/bookmarks', requireAuth(env.JWT_ACCESS_SECRET), async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const { items, meta } = await svc.listBookmarks(req.auth!.id, page, limit);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  router.get('/download/:id', requireAuth(env.JWT_ACCESS_SECRET), validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const result = await svc.getDownloadUrl(req.auth!.id, params.id);
      return ok(res, result);
    } catch (err) { next(err); }
  });

  router.get('/:id', optionalAuth(env.JWT_ACCESS_SECRET), validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const material = await svc.getMaterialAndView(params.id, req.auth?.id);
      return ok(res, { item: material });
    } catch (err) { next(err); }
  });

  router.post('/:id/bookmark', requireAuth(env.JWT_ACCESS_SECRET), validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      return ok(res, await svc.addBookmark(req.auth!.id, params.id), 201);
    } catch (err) { next(err); }
  });

  router.delete('/:id/bookmark', requireAuth(env.JWT_ACCESS_SECRET), validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      return ok(res, await svc.removeBookmark(req.auth!.id, params.id));
    } catch (err) { next(err); }
  });

  router.post('/:id/report', requireAuth(env.JWT_ACCESS_SECRET), validate({ params: idParam, body: reportSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const report = await svc.reportMaterial(req.auth!.id, params.id, req.body.reason);
      return ok(res, { id: String(report._id), status: report.status }, 201);
    } catch (err) { next(err); }
  });

  const admin = Router();
  admin.use(requireAuth(env.JWT_ACCESS_SECRET), requirePermission(PERMISSIONS.CONTENT_MANAGE));

  admin.get('/materials', validate({ query: adminListQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as Validated<{ type?: string; status?: string; q?: string; page: number; limit: number }>).validatedQuery!;
      const { items, meta } = await svc.adminListMaterials(query);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  admin.post('/materials', validate({ body: materialBodySchema }), async (req, res, next) => {
    try {
      const material = await svc.adminCreateMaterial(req.body, req.auth!.id);
      return ok(res, { item: material }, 201);
    } catch (err) { next(err); }
  });

  admin.get('/materials/reports', validate({ query: listReportsQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as Validated<{ status: string; page: number; limit: number }>).validatedQuery!;
      const { items, meta } = await svc.adminListReports(query);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  admin.post('/materials/reports/:reportId/resolve', validate({ body: resolveReportSchema }), async (req, res, next) => {
    try {
      const reportId = typeof req.params.reportId === 'string' ? req.params.reportId : '';
      const report = await svc.adminResolveReport(reportId, req.body.status, req.body.note, req.auth!.id);
      return ok(res, { id: String(report._id), status: report.status });
    } catch (err) { next(err); }
  });

  admin.get('/materials/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      return ok(res, { item: await svc.adminGetMaterial(params.id) });
    } catch (err) { next(err); }
  });

  admin.put('/materials/:id', validate({ params: idParam, body: updateMaterialSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const material = await svc.adminUpdateMaterial(params.id, req.body, req.auth!.id);
      return ok(res, { item: material });
    } catch (err) { next(err); }
  });

  admin.post('/materials/:id/publish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const material = await svc.adminSetStatus(params.id, 'published', req.auth!.id);
      return ok(res, { id: String(material._id), status: material.status });
    } catch (err) { next(err); }
  });

  admin.post('/materials/:id/unpublish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      const material = await svc.adminSetStatus(params.id, 'unpublished', req.auth!.id);
      return ok(res, { id: String(material._id), status: material.status });
    } catch (err) { next(err); }
  });

  admin.delete('/materials/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as Validated<{ id: string }>).validatedParams!;
      await svc.adminSoftDeleteMaterial(params.id, req.auth!.id);
      return ok(res, { deleted: true });
    } catch (err) { next(err); }
  });

  router.use('/admin', admin);
  return router;
}
