import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import type { Env } from './config/env';
import { authRoutes } from './modules/auth/auth.routes';
import { usersRoutes } from './modules/users/users.routes';
import { academicRoutes } from './modules/academic/academic.routes';
import { settingsRoutes } from './modules/settings/settings.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { gpaRoutes } from './modules/gpa/gpa.routes';
import { materialsRoutes } from './modules/materials/materials.routes';
import { examRoutes } from './modules/exams/exam.routes';
import { plannerRoutes } from './modules/planner/planner.routes';
import { communityRoutes } from './modules/community/community.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { resultsRoutes } from './modules/results/results.routes';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';

export function createApp(env: Env) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  // Local dev convenience: Flutter web / Vite dev servers use arbitrary
  // localhost ports, so any localhost/127.0.0.1 origin is allowed outside
  // production. Production keeps the strict configured list.
  const localOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || origins.includes(origin)) return cb(null, true);
      if (env.NODE_ENV !== 'production' && localOrigin.test(origin)) return cb(null, true);
      if (origins.length === 0) return cb(null, true);
      return cb(new Error('Origin not allowed by CORS'));
    },
    credentials: true
  }));

  if (env.NODE_ENV !== 'test') {
    app.use(rateLimit({
      windowMs: 5 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } }
    }));
  }

  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });

  const api = express.Router();
  api.use('/auth', authRoutes(env));
  api.use('/users', usersRoutes(env));
  api.use('/academic', academicRoutes(env));
  api.use('/settings', settingsRoutes());
  api.use('/gpa', gpaRoutes(env));
  api.use('/materials', materialsRoutes(env));
  api.use('/exams', examRoutes(env));
  api.use('/planner', plannerRoutes(env));
  api.use('/community', communityRoutes(env));
  api.use('/notifications', notificationsRoutes(env));
  api.use('/results', resultsRoutes(env));
  api.use('/admin', adminRoutes(env));
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
