import { Router } from 'express';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import * as authService from '../auth/auth.service';
import * as usersService from './users.service';
import { academicInfoSchema, fcmTokenSchema, preferencesSchema, updateProfileSchema } from './users.schemas';

export function usersRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  const meta = (req: { ip?: string; headers: Record<string, unknown> }) => ({
    ip: req.ip,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined
  });

  router.get('/me', async (req, res, next) => {
    try {
      const user = await authService.sessions_findUser(req.auth!.id);
      return ok(res, { user: authService.publicUser(user) });
    } catch (err) { next(err); }
  });

  router.patch('/me', validate({ body: updateProfileSchema }), async (req, res, next) => {
    try {
      const user = await usersService.updateProfile(req.auth!.id, req.body);
      return ok(res, { user: authService.publicUser(user) });
    } catch (err) { next(err); }
  });

  router.patch('/me/academic-info', validate({ body: academicInfoSchema }), async (req, res, next) => {
    try {
      const user = await usersService.updateAcademicInfo(req.auth!.id, req.body, meta(req));
      return ok(res, { user: authService.publicUser(user) });
    } catch (err) { next(err); }
  });

  router.patch('/me/preferences', validate({ body: preferencesSchema }), async (req, res, next) => {
    try {
      const user = await usersService.updatePreferences(req.auth!.id, req.body);
      return ok(res, { user: authService.publicUser(user) });
    } catch (err) { next(err); }
  });

  router.post('/me/fcm-tokens', validate({ body: fcmTokenSchema }), async (req, res, next) => {
    try {
      await usersService.addFcmToken(req.auth!.id, req.body.token);
      return ok(res, { registered: true }, 201);
    } catch (err) { next(err); }
  });

  router.delete('/me/fcm-tokens', validate({ body: fcmTokenSchema }), async (req, res, next) => {
    try {
      await usersService.removeFcmToken(req.auth!.id, req.body.token);
      return ok(res, { removed: true });
    } catch (err) { next(err); }
  });

  router.post('/me/deletion-request', async (req, res, next) => {
    try {
      await usersService.requestDeletion(req.auth!.id, meta(req));
      return ok(res, { requested: true }, 202);
    } catch (err) { next(err); }
  });

  return router;
}
