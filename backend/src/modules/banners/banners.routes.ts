import { Router } from 'express';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { PERMISSIONS } from '../../core/permissions';
import * as svc from './banners.service';
import { bannerBodySchema, idParam, updateBannerSchema } from './banners.schemas';

type V<T> = { validatedQuery?: T; validatedParams?: T; validatedBody?: T };

export function bannersRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  router.get('/', async (_req, res, next) => {
    try {
      const items = await svc.listActive();
      return ok(res, { items });
    } catch (err) { next(err); }
  });

  const admin = Router();
  admin.use(requirePermission(PERMISSIONS.CONTENT_MANAGE));

  admin.get('/', async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const { items, meta } = await svc.listAll(page, limit, status);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  admin.post('/', validate({ body: bannerBodySchema }), async (req, res, next) => {
    try {
      const banner = await svc.createBanner(req.body as Record<string, unknown>, req.auth!.id, req.ip, req.headers['user-agent']);
      return ok(res, { item: banner }, 201);
    } catch (err) { next(err); }
  });

  admin.put('/:id', validate({ params: idParam, body: updateBannerSchema }), async (req, res, next) => {
    try {
      const { id } = (req as unknown as V<{ id: string }>).validatedParams!;
      const banner = await svc.updateBanner(id, req.body as Record<string, unknown>, req.auth!.id, req.ip, req.headers['user-agent']);
      return ok(res, { item: banner });
    } catch (err) { next(err); }
  });

  admin.post('/:id/publish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = (req as unknown as V<{ id: string }>).validatedParams!;
      const banner = await svc.publishBanner(id, req.auth!.id, req.ip, req.headers['user-agent']);
      return ok(res, { id: String(banner._id), status: banner.status });
    } catch (err) { next(err); }
  });

  admin.post('/:id/unpublish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = (req as unknown as V<{ id: string }>).validatedParams!;
      const banner = await svc.unpublishBanner(id, req.auth!.id, req.ip, req.headers['user-agent']);
      return ok(res, { id: String(banner._id), status: banner.status });
    } catch (err) { next(err); }
  });

  admin.delete('/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = (req as unknown as V<{ id: string }>).validatedParams!;
      return ok(res, await svc.deleteBanner(id, req.auth!.id, req.ip, req.headers['user-agent']));
    } catch (err) { next(err); }
  });

  router.use('/admin', admin);
  return router;
}
