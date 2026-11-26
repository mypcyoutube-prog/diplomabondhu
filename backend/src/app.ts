import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import type { Env } from './config/env';
import { authRoutes } from './modules/auth/auth.routes';
import { usersRoutes } from './modules/users/users.routes';
import { academicRoutes } from './modules/academic/academic.routes';
import { btebSubjectsRoutes } from './modules/bteb-subjects/bteb-subjects.routes';
import { settingsRoutes } from './modules/settings/settings.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { gpaRoutes } from './modules/gpa/gpa.routes';
import { materialsRoutes } from './modules/materials/materials.routes';
import { examRoutes } from './modules/exams/exam.routes';
import { plannerRoutes } from './modules/planner/planner.routes';
import { communityRoutes } from './modules/community/community.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { bannersRoutes } from './modules/banners/banners.routes';
import { resultsRoutes } from './modules/results/results.routes';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { searchRoutes } from './modules/search/search.routes';
import { dashboardPrefsRoutes } from './modules/dashboard-prefs/dashboard-prefs.routes';
import { workspaceRoutes } from './modules/workspace/workspace.routes';
import { syncRoutes } from './modules/sync/sync.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { exportRoutes } from './modules/export/export.routes';

const APP_VERSION = (() => {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')) as { version?: string };
    return pkg.version ?? 'dev';
  } catch {
    return 'dev';
  }
})();

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
      // Authenticated admin progress polls ride on the same IP while a long
      // parse/import runs; counting them would starve every other request.
      skip: (req) =>
        req.path.startsWith('/api/v1/results/admin/parse-job/') ||
        req.path.startsWith('/api/v1/results/admin/import-progress/'),
      message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } }
    }));
  }

  app.get('/health', async (_req, res) => {
    let db = 'up';
    try {
      await mongoose.connection.db?.admin().command({ ping: 1 });
    } catch {
      db = 'down';
    }
    res.json({ status: db === 'up' ? 'ok' : 'degraded', db, version: APP_VERSION, uptimeSec: Math.round(process.uptime()) });
  });

  const api = express.Router();
  api.use('/auth', authRoutes(env));
  api.use('/users', usersRoutes(env));
  api.use('/academic', academicRoutes(env));
  api.use('/bteb-subjects', btebSubjectsRoutes(env));
  api.use('/settings', settingsRoutes());
  api.use('/gpa', gpaRoutes(env));
  api.use('/materials', materialsRoutes(env));
  api.use('/exams', examRoutes(env));
  api.use('/planner', plannerRoutes(env));
  api.use('/community', communityRoutes(env));
  api.use('/notifications', notificationsRoutes(env));
  api.use('/banners', bannersRoutes(env));
  api.use('/results', resultsRoutes(env));
  api.use('/search', searchRoutes(env));
  api.use('/me/dashboard-preferences', dashboardPrefsRoutes(env));
  api.use('/workspace', workspaceRoutes(env));
  api.use('/sync', syncRoutes(env));
  api.use('/ai', aiRoutes(env));
  api.use('/export', exportRoutes(env));
  api.use('/admin', adminRoutes(env));
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
