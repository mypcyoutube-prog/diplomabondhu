import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { unauthenticated, validationError } from '../../core/errors';
import * as authService from './auth.service';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, refreshSchema, registerSchema, resetPasswordSchema, sessionIdSchema } from './auth.schemas';

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } }
});

export function authRoutes(env: Env) {
  const router = Router();
  const authEnv = {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTokenTtl: env.ACCESS_TOKEN_TTL,
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS
  };

  const meta = (req: { ip?: string; headers: Record<string, unknown> }) => ({
    ip: req.ip,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined
  });

  router.post('/register', authRateLimit, validate({ body: registerSchema }), async (req, res, next) => {
    try {
      const { user, tokens } = await authService.register(req.body, authEnv, meta(req));
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
      });
      return ok(res, { user: authService.publicUser(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 201);
    } catch (err) { next(err); }
  });

  router.post('/login', authRateLimit, validate({ body: loginSchema }), async (req, res, next) => {
    try {
      const { user, tokens } = await authService.login(req.body, authEnv, meta(req));
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
      });
      return ok(res, { user: authService.publicUser(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    } catch (err) { next(err); }
  });

  router.post('/refresh', validate({ body: refreshSchema }), async (req, res, next) => {
    try {
      const raw = (req.body?.refreshToken as string) || (req.cookies?.refreshToken as string);
      if (!raw) throw validationError('Refresh token is required');
      const { user, tokens } = await authService.rotateRefreshToken(raw, authEnv, meta(req));
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
      });
      return ok(res, { user: authService.publicUser(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    } catch (err) { next(err); }
  });

  router.post('/logout', validate({ body: refreshSchema }), async (req, res, next) => {
    try {
      const raw = (req.body?.refreshToken as string) || (req.cookies?.refreshToken as string);
      if (raw) await authService.revokeRefreshToken(raw);
      res.clearCookie('refreshToken');
      return ok(res, { loggedOut: true });
    } catch (err) { next(err); }
  });

  router.post('/forgot-password', authRateLimit, validate({ body: forgotPasswordSchema }), async (req, res, next) => {
    try {
      await authService.requestPasswordReset(req.body.email, meta(req));
      return ok(res, { accepted: true, message: 'If the email is registered, a reset request was created. Contact support to receive your one-time reset code.' }, 202);
    } catch (err) { next(err); }
  });

  router.post('/reset-password', authRateLimit, validate({ body: resetPasswordSchema }), async (req, res, next) => {
    try {
      await authService.resetPassword(req.body.token, req.body.newPassword, meta(req));
      return ok(res, { passwordReset: true, message: 'Password updated. Please log in with your new password.' });
    } catch (err) { next(err); }
  });

  router.get('/me', requireAuth(env.JWT_ACCESS_SECRET), async (req, res, next) => {
    try {
      const user = await authService.sessions_findUser(req.auth!.id);
      return ok(res, { user: authService.publicUser(user) });
    } catch (err) { next(err); }
  });

  router.post('/change-password', requireAuth(env.JWT_ACCESS_SECRET), validate({ body: changePasswordSchema }), async (req, res, next) => {
    try {
      await authService.changePassword(req.auth!.id, req.body.currentPassword, req.body.newPassword, authEnv);
      res.clearCookie('refreshToken');
      return ok(res, { passwordChanged: true, message: 'All sessions revoked. Please log in again.' });
    } catch (err) { next(err); }
  });

  router.get('/sessions', requireAuth(env.JWT_ACCESS_SECRET), async (req, res, next) => {
    try {
      const sessions = await authService.listSessions(req.auth!.id);
      return ok(res, { sessions });
    } catch (err) { next(err); }
  });

  router.delete('/sessions/:id', requireAuth(env.JWT_ACCESS_SECRET), validate({ params: sessionIdSchema }), async (req, res, next) => {
    try {
      await authService.revokeSessionById(req.auth!.id, (req as unknown as { validatedParams: { id: string } }).validatedParams.id);
      return ok(res, { revoked: true });
    } catch (err) { next(err); }
  });

  return router;
}
