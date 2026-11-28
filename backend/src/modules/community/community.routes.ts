import { Router } from 'express';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { PERMISSIONS } from '../../core/permissions';
import * as svc from './community.service';
import {
  commentSchema, idParam, postBodySchema, postUpdateSchema, reportSchema,
  listPostsQuerySchema, moderationActionSchema, featureActionSchema
} from './community.schemas';

type V<T> = { validatedQuery?: T; validatedParams?: T };

export function communityRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  router.get('/guidelines', async (_req, res, next) => {
    try { return ok(res, svc.GUIDELINES); }
    catch (err) { next(err); }
  });

  router.post('/guidelines/accept', async (req, res, next) => {
    try { return ok(res, await svc.acceptGuidelines(req.auth!.id)); }
    catch (err) { next(err); }
  });

  router.get('/posts', validate({ query: listPostsQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as V<svc.ListPostsOptions>).validatedQuery!;
      const { items, meta } = await svc.listPosts(query);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  router.post('/posts', validate({ body: postBodySchema }), async (req, res, next) => {
    try {
      const post = await svc.createPost(req.auth!.id, req.body);
      return ok(res, { item: post }, 201);
    } catch (err) { next(err); }
  });

  router.get('/posts/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      return ok(res, await svc.getPostWithComments(params.id));
    } catch (err) { next(err); }
  });

  router.patch('/posts/:id', validate({ params: idParam, body: postUpdateSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const post = await svc.updatePost(req.auth!.id, params.id, req.body);
      return ok(res, { item: post });
    } catch (err) { next(err); }
  });

  router.delete('/posts/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      await svc.deletePost(req.auth!.id, params.id);
      return ok(res, { deleted: true });
    } catch (err) { next(err); }
  });

  router.post('/posts/:id/like', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      return ok(res, await svc.likePost(req.auth!.id, params.id));
    } catch (err) { next(err); }
  });

  router.delete('/posts/:id/like', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      return ok(res, await svc.unlikePost(req.auth!.id, params.id));
    } catch (err) { next(err); }
  });

  router.post('/posts/:id/comments', validate({ params: idParam, body: commentSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const comment = await svc.addComment(req.auth!.id, params.id, req.body);
      return ok(res, { item: comment }, 201);
    } catch (err) { next(err); }
  });

  router.post('/reports', validate({ body: reportSchema }), async (req, res, next) => {
    try {
      await svc.reportContent(req.auth!.id, req.body);
      return ok(res, { reported: true }, 201);
    } catch (err) { next(err); }
  });

  const admin = Router();
  admin.use(requirePermission(PERMISSIONS.MODERATE));

  admin.get('/reports', validate({ query: svc.reportListQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as V<{ status: string; page: number; limit: number }>).validatedQuery!;
      const { items, meta } = await svc.listReports(query);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  admin.get('/posts', validate({ query: svc.adminPostsQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as V<{ status?: string; page: number; limit: number }>).validatedQuery!;
      const { items, meta } = await svc.adminListPosts(query);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  admin.post('/posts/:id/moderate', validate({ params: idParam, body: moderationActionSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const post = await svc.moderatePost(params.id, req.body.action, req.auth!.id, req.body.reason);
      return ok(res, { id: String(post._id), status: post.status });
    } catch (err) { next(err); }
  });

  admin.post('/posts/:id/feature', validate({ params: idParam, body: featureActionSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const post = await svc.setFeaturedPost(params.id, req.body.featured, req.auth!.id);
      return ok(res, { id: String(post._id), featured: post.featured });
    } catch (err) { next(err); }
  });

  router.use('/admin', admin);
  return router;
}
