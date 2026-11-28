import { Router } from 'express';
import { Types } from 'mongoose';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requireAdmin, requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { notFound } from '../../core/errors';
import * as authService from '../auth/auth.service';
import { PERMISSIONS } from '../../core/permissions';
import { User } from '../../models/user.model';
import { AuditLog, writeAudit } from '../../models/audit-log.model';
import { StudyMaterial } from '../../models/study-material.model';
import { Exam } from '../../models/exam.model';
import { CommunityPost } from '../../models/community-post.model';
import { getAppSettings } from '../settings/settings.routes';
import { idParamSchema, settingsUpdateSchema, studentListQuerySchema, suspendSchema } from './admin.schemas';
import { homeAdminRoutes } from '../home/home.routes';
import { homeImportAdminRoutes, homeRecoveryAdminRoutes } from '../home-import/home-import.routes';

export function adminRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET), requireAdmin);

  router.use('/home', homeAdminRoutes(env));
  router.use('/home', homeImportAdminRoutes(env));
  router.use('/home', homeRecoveryAdminRoutes(env));

  router.get('/dashboard', async (_req, res, next) => {
    try {
      const [totalStudents, newRegistrations, activeStudents, suspendedStudents, totalMaterials, publishedMaterials, totalExams, totalPosts, openReports] = await Promise.all([
        User.countDocuments({ role: 'student', deletedAt: null }),
        User.countDocuments({ role: 'student', createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        User.countDocuments({ role: 'student', status: 'active', lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
        User.countDocuments({ role: 'student', status: 'suspended' }),
        StudyMaterial.countDocuments({ deletedAt: null }),
        StudyMaterial.countDocuments({ status: 'published', deletedAt: null }),
        Exam.countDocuments({ deletedAt: null }),
        CommunityPost.countDocuments({ status: 'visible' }),
        CommunityPost.countDocuments({ 'reports.status': 'open' })
      ]);
      return ok(res, {
        students: { total: totalStudents, newRegistrations7d: newRegistrations, activeLast30d: activeStudents, suspended: suspendedStudents },
        content: { materials: totalMaterials, publishedMaterials },
        exams: { total: totalExams },
        community: { visiblePosts: totalPosts, openReports },
        systemHealth: { status: 'ok' }
      });
    } catch (err) { next(err); }
  });

  router.get('/students', validate({ query: studentListQuerySchema }), async (req, res, next) => {
    try {
      const q = (req as unknown as { validatedQuery: { page: number; limit: number; status?: string; q?: string } }).validatedQuery;
      const filter: Record<string, unknown> = { role: 'student', deletedAt: null };
      if (q.status) filter.status = q.status;
      if (q.q) filter.email = { $regex: q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      const [items, total] = await Promise.all([
        User.find(filter).select('name email phone status profile createdAt lastLoginAt').skip((q.page - 1) * q.limit).limit(q.limit).sort({ createdAt: -1 }).lean(),
        User.countDocuments(filter)
      ]);
      return ok(res, { items }, 200, { page: q.page, limit: q.limit, total });
    } catch (err) { next(err); }
  });

  router.get('/students/:id', validate({ params: idParamSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
      const student = await User.findOne({ _id: new Types.ObjectId(params.id), role: 'student', deletedAt: null }).select('-passwordHash -fcmTokens').lean();
      if (!student) throw notFound('Student not found');
      const audit = await AuditLog.find({ targetType: 'User', targetId: params.id }).sort({ at: -1 }).limit(20).lean();
      return ok(res, { student, auditHistory: audit });
    } catch (err) { next(err); }
  });

  router.post('/students/:id/suspend', validate({ params: idParamSchema, body: suspendSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
      const student = await User.findOneAndUpdate(
        { _id: new Types.ObjectId(params.id), role: 'student' },
        { $set: { status: 'suspended' } },
        { new: true }
      );
      if (!student) throw notFound('Student not found');
      await writeAudit({ actorId: req.auth!.id, action: 'student.suspended', targetType: 'User', targetId: params.id, after: { reason: req.body.reason }, ip: req.ip });
      return ok(res, { status: student.status });
    } catch (err) { next(err); }
  });

  router.post('/students/:id/reactivate', validate({ params: idParamSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
      const student = await User.findOneAndUpdate(
        { _id: new Types.ObjectId(params.id), role: 'student' },
        { $set: { status: 'active' } },
        { new: true }
      );
      if (!student) throw notFound('Student not found');
      await writeAudit({ actorId: req.auth!.id, action: 'student.reactivated', targetType: 'User', targetId: params.id, ip: req.ip });
      return ok(res, { status: student.status });
    } catch (err) { next(err); }
  });

  router.post('/students/:id/password-reset', validate({ params: idParamSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
      const result = await authService.issuePasswordResetToken(req.auth!.id, params.id);
      return ok(res, result);
    } catch (err) { next(err); }
  });

  router.get('/audit-logs', requirePermission(PERMISSIONS.AUDIT_READ), async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const filter: Record<string, unknown> = {};
      if (typeof req.query.action === 'string') filter.action = { $regex: req.query.action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') };
      const [items, total] = await Promise.all([
        AuditLog.find(filter).sort({ at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        AuditLog.countDocuments(filter)
      ]);
      return ok(res, { items }, 200, { page, limit, total });
    } catch (err) { next(err); }
  });

  router.put('/settings', requirePermission(PERMISSIONS.SETTINGS_MANAGE), validate({ body: settingsUpdateSchema }), async (req, res, next) => {
    try {
      const settings = await getAppSettings();
      const before = settings.toObject();
      const b = req.body as Record<string, unknown>;
      if (b.branding) settings.branding = { ...settings.branding, ...(b.branding as object) };
      if (b.homepageSections) settings.homepageSections = b.homepageSections as typeof settings.homepageSections;
      if (b.resultDisplay) {
        settings.resultDisplay = { ...settings.resultDisplay, ...b.resultDisplay } as typeof settings.resultDisplay;
      }
      if (b.homeNotice) {
        settings.homeNotice = { ...settings.homeNotice, ...b.homeNotice } as typeof settings.homeNotice;
      }
      if (typeof b.homeNoticeShowInTicker === 'boolean') settings.homeNoticeShowInTicker = b.homeNoticeShowInTicker;
      if (b.libraryCategories) {
        settings.libraryCategories = { ...settings.libraryCategories, ...b.libraryCategories } as typeof settings.libraryCategories;
      }
      if (b.featureFlags) settings.featureFlags = { ...settings.featureFlags, ...(b.featureFlags as object) };
      if (typeof b.maintenanceMode === 'boolean') settings.maintenanceMode = b.maintenanceMode;
      if (b.supportInfo) settings.supportInfo = { ...settings.supportInfo, ...(b.supportInfo as object) };
      if (b.legal) settings.legal = { ...settings.legal, ...(b.legal as object) };
      if (b.versionInfo) settings.versionInfo = { ...settings.versionInfo, ...(b.versionInfo as object) };
      await settings.save();
      await writeAudit({ actorId: req.auth!.id, action: 'settings.updated', targetType: 'AppSettings', targetId: String(settings._id), before: { maintenanceMode: before.maintenanceMode }, after: { maintenanceMode: settings.maintenanceMode }, ip: req.ip });
      return ok(res, { settings });
    } catch (err) { next(err); }
  });

  return router;
}
