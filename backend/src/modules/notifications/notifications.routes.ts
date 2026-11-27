import { Router } from 'express';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { PERMISSIONS } from '../../core/permissions';
import * as svc from './notifications.service';
import { announcementBodySchema, idParam, preferencesSchema, updateAnnouncementSchema } from './notifications.schemas';

const publishedFilter = (raw: unknown): 'bteb' | 'admin' | undefined =>
  raw === 'bteb' || raw === 'admin' ? raw : undefined;

type V<T> = { validatedQuery?: T; validatedParams?: T };

export function notificationsRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  router.get('/', async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const { items, meta } = await svc.listInbox(req.auth!.id, page, limit);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  router.post('/read-all', async (req, res, next) => {
    try { return ok(res, await svc.markAllRead(req.auth!.id)); }
    catch (err) { next(err); }
  });

  router.get('/preferences', async (req, res, next) => {
    try { return ok(res, await svc.getPreferences(req.auth!.id)); }
    catch (err) { next(err); }
  });

  router.put('/preferences', validate({ body: preferencesSchema }), async (req, res, next) => {
    try { return ok(res, await svc.updatePreferences(req.auth!.id, req.body.categories, req.body.quietHours)); }
    catch (err) { next(err); }
  });

  router.get('/announcements/published', async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const source = publishedFilter(req.query.source);
      const { items, meta } = await svc.listPublishedAnnouncements({ source, page, limit });
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  router.get('/announcements/published/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      return ok(res, { item: await svc.getPublishedAnnouncement(params.id) });
    } catch (err) { next(err); }
  });

  router.post('/:id/read', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      return ok(res, await svc.markRead(req.auth!.id, params.id));
    } catch (err) { next(err); }
  });

  const admin = Router();
  admin.use(requirePermission(PERMISSIONS.NOTIFY_MANAGE));

  admin.get('/announcements', async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const { items, meta } = await svc.listAnnouncements({ status, page, limit });
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  admin.post('/announcements', validate({ body: announcementBodySchema }), async (req, res, next) => {
    try {
      const announcement = await svc.createAnnouncement(req.body, req.auth!.id);
      return ok(res, { item: announcement }, 201);
    } catch (err) { next(err); }
  });

  admin.put('/announcements/:id', validate({ params: idParam, body: updateAnnouncementSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const announcement = await svc.updateAnnouncement(params.id, req.body);
      return ok(res, { item: announcement });
    } catch (err) { next(err); }
  });

  admin.post('/announcements/:id/publish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const announcement = await svc.publishAnnouncement(params.id, req.auth!.id);
      return ok(res, { id: String(announcement._id), status: announcement.status, recipientCount: announcement.recipientCount });
    } catch (err) { next(err); }
  });

  admin.delete('/announcements/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      await svc.deleteAnnouncement(params.id, req.auth!.id);
      return ok(res, { deleted: true });
    } catch (err) { next(err); }
  });

  admin.get('/delivery-stats', async (_req, res, next) => {
    try { return ok(res, await svc.getDeliveryStats()); }
    catch (err) { next(err); }
  });

  router.use('/admin', admin);
  return router;
}
