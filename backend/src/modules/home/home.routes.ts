import { Router } from 'express';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { PERMISSIONS } from '../../core/permissions';
import * as svc from './home.service';
import {
  homeConfigBodySchema, homeConfigUpdateSchema, idParam, listQuerySchema,
  quickAccessBodySchema, quickAccessUpdateSchema, reorderSchema, scheduleSchema,
  studyResourceBodySchema, studyResourceUpdateSchema, welcomeSchema
} from './home.schemas';

type V<T> = { validatedQuery?: T; validatedParams?: T; validatedBody?: T };

function parseBody<T>(req: unknown): T {
  return ((req as V<T>).validatedBody ?? (req as { body?: T }).body) as T;
}
function parseParams<T>(req: unknown): T {
  return (req as V<T>).validatedParams as T;
}
function parseQuery<T>(req: unknown): T {
  return (req as V<T>).validatedQuery as T;
}

export function homePublicRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  router.get('/content', async (_req, res, next) => {
    try {
      return ok(res, await svc.getPublicHomeContent());
    } catch (err) { next(err); }
  });

  return router;
}

export function homeAdminRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET), requirePermission(PERMISSIONS.CONTENT_MANAGE));

  /* ---- Quick Access ---- */
  router.get('/quick-access', validate({ query: listQuerySchema }), async (req, res, next) => {
    try { return ok(res, await svc.listQuickAccess(parseQuery(req))); } catch (err) { next(err); }
  });

  router.post('/quick-access', validate({ body: quickAccessBodySchema }), async (req, res, next) => {
    try { return ok(res, { item: await svc.createQuickAccess(parseBody(req), req.auth!.id) }, 201); } catch (err) { next(err); }
  });

  router.put('/quick-access/:id', validate({ params: idParam, body: quickAccessUpdateSchema }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, { item: await svc.updateQuickAccess(id, parseBody(req), req.auth!.id) });
    } catch (err) { next(err); }
  });

  router.post('/quick-access/:id/publish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, { item: await svc.setQuickAccessStatus(id, 'published', req.auth!.id) });
    } catch (err) { next(err); }
  });

  router.post('/quick-access/:id/unpublish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, { item: await svc.setQuickAccessStatus(id, 'draft', req.auth!.id) });
    } catch (err) { next(err); }
  });

  router.post('/quick-access/:id/schedule', validate({ params: idParam, body: scheduleSchema }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      const { scheduledAt } = parseBody<{ scheduledAt: Date }>(req);
      return ok(res, { item: await svc.scheduleQuickAccess(id, scheduledAt, req.auth!.id) });
    } catch (err) { next(err); }
  });

  router.post('/quick-access/:id/visibility', validate({ params: idParam, body: welcomeSchema.pick({ visible: true }) }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      const { visible } = parseBody<{ visible: boolean }>(req);
      return ok(res, { item: await svc.setQuickAccessVisibility(id, visible, req.auth!.id) });
    } catch (err) { next(err); }
  });

  router.post('/quick-access/:id/archive', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, { item: await svc.archiveQuickAccess(id, req.auth!.id, true) });
    } catch (err) { next(err); }
  });

  router.post('/quick-access/:id/unarchive', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, { item: await svc.archiveQuickAccess(id, req.auth!.id, false) });
    } catch (err) { next(err); }
  });

  router.post('/quick-access/:id/restore', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, await svc.restoreQuickAccess(id, req.auth!.id));
    } catch (err) { next(err); }
  });

  router.delete('/quick-access/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, await svc.deleteQuickAccess(id, req.auth!.id));
    } catch (err) { next(err); }
  });

  router.post('/quick-access/reorder', validate({ body: reorderSchema }), async (req, res, next) => {
    try { return ok(res, await svc.reorderQuickAccess(parseBody<{ items: { id: string; displayOrder: number }[] }>(req).items, req.auth!.id)); } catch (err) { next(err); }
  });

  /* ---- Study Resources ---- */
  router.get('/study-resources', validate({ query: listQuerySchema }), async (req, res, next) => {
    try { return ok(res, await svc.listStudyResources(parseQuery(req))); } catch (err) { next(err); }
  });

  router.post('/study-resources', validate({ body: studyResourceBodySchema }), async (req, res, next) => {
    try { return ok(res, { item: await svc.createStudyResource(parseBody(req), req.auth!.id) }, 201); } catch (err) { next(err); }
  });

  router.put('/study-resources/:id', validate({ params: idParam, body: studyResourceUpdateSchema }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, { item: await svc.updateStudyResource(id, parseBody(req), req.auth!.id) });
    } catch (err) { next(err); }
  });

  router.post('/study-resources/:id/publish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, { item: await svc.setStudyResourceStatus(id, 'published', req.auth!.id) });
    } catch (err) { next(err); }
  });

  router.post('/study-resources/:id/unpublish', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, { item: await svc.setStudyResourceStatus(id, 'draft', req.auth!.id) });
    } catch (err) { next(err); }
  });

  router.post('/study-resources/:id/visibility', validate({ params: idParam, body: welcomeSchema.pick({ visible: true }) }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      const { visible } = parseBody<{ visible: boolean }>(req);
      return ok(res, { item: await svc.setStudyResourceVisibility(id, visible, req.auth!.id) });
    } catch (err) { next(err); }
  });

  router.post('/study-resources/:id/archive', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, { item: await svc.archiveStudyResource(id, req.auth!.id, true) });
    } catch (err) { next(err); }
  });

  router.post('/study-resources/:id/unarchive', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, { item: await svc.archiveStudyResource(id, req.auth!.id, false) });
    } catch (err) { next(err); }
  });

  router.post('/study-resources/:id/restore', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, await svc.restoreStudyResource(id, req.auth!.id));
    } catch (err) { next(err); }
  });

  router.delete('/study-resources/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, await svc.deleteStudyResource(id, req.auth!.id));
    } catch (err) { next(err); }
  });

  router.post('/study-resources/reorder', validate({ body: reorderSchema }), async (req, res, next) => {
    try { return ok(res, await svc.reorderStudyResources(parseBody<{ items: { id: string; displayOrder: number }[] }>(req).items, req.auth!.id)); } catch (err) { next(err); }
  });

  /* ---- Home Configuration ---- */
  router.get('/configuration', async (_req, res, next) => {
    try { return ok(res, { items: await svc.listHomeConfig() }); } catch (err) { next(err); }
  });

  router.post('/configuration', validate({ body: homeConfigBodySchema }), async (req, res, next) => {
    try { return ok(res, { item: await svc.upsertHomeConfig(parseBody(req), req.auth!.id) }); } catch (err) { next(err); }
  });

  router.put('/configuration/:id', validate({ params: idParam, body: homeConfigUpdateSchema }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, { item: await svc.updateHomeConfig(id, parseBody(req), req.auth!.id) });
    } catch (err) { next(err); }
  });

  router.delete('/configuration/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const { id } = parseParams<{ id: string }>(req);
      return ok(res, await svc.deleteHomeConfig(id, req.auth!.id));
    } catch (err) { next(err); }
  });

  /* ---- Welcome configuration (SETTINGS_MANAGE) ---- */
  const welcome = Router();
  welcome.use(requirePermission(PERMISSIONS.SETTINGS_MANAGE));

  welcome.get('/', async (_req, res, next) => {
    try { return ok(res, await svc.getWelcome()); } catch (err) { next(err); }
  });

  welcome.put('/', validate({ body: welcomeSchema }), async (req, res, next) => {
    try { return ok(res, await svc.updateWelcome(parseBody(req), req.auth!.id)); } catch (err) { next(err); }
  });

  router.use('/welcome', welcome);
  return router;
}
