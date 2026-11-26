import { Router } from 'express';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requireAdmin, requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { conflict, notFound } from '../../core/errors';
import { PERMISSIONS } from '../../core/permissions';
import { CalculationProfile } from '../../models/calculation-profile.model';
import { writeAudit } from '../../models/audit-log.model';
import * as svc from './gpa.service';
import { cgpaCalcSchema, createProfileSchema, saveResultSchema, transitionSchema, updateProfileSchema, idParam } from './gpa.schemas';
import { Types } from 'mongoose';

export function gpaRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  router.get('/profiles', async (req, res, next) => {
    try {
      const regulationId = typeof req.query.regulationId === 'string' ? req.query.regulationId : undefined;
      const programId = typeof req.query.programId === 'string' ? req.query.programId : undefined;
      const items = await svc.listProfilesForStudent(programId, regulationId);
      return ok(res, { items });
    } catch (err) { next(err); }
  });

  router.get('/profiles/:id/structure', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
      const profile = await svc.getPublishedProfile(params.id);
      return ok(res, {
        profileId: profile._id,
        version: profile.version,
        grading: profile.data.grading,
        assessments: profile.data.assessments,
        passRules: profile.data.passRules,
        cgpa: profile.data.cgpa
      });
    } catch (err) { next(err); }
  });

  router.post('/calculate/cgpa', validate({ body: cgpaCalcSchema }), async (req, res, next) => {
    try {
      const profile = await svc.getPublishedProfile(req.body.profileId);
      const result = await svc.calculateCgpa(profile, req.body.semesterGpas);
      return ok(res, { ...result, profileVersion: profile.version });
    } catch (err) { next(err); }
  });

  router.post('/results', validate({ body: saveResultSchema }), async (req, res, next) => {
    try {
      const doc = await svc.saveResult(req.auth!.id, req.body);
      return ok(res, { id: String(doc._id) }, 201);
    } catch (err) { next(err); }
  });

  router.get('/results', async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const { items, meta } = await svc.listHistory(req.auth!.id, page, limit);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  router.get('/results/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
      const item = await svc.getHistoryItem(req.auth!.id, params.id);
      return ok(res, { item });
    } catch (err) { next(err); }
  });

  router.delete('/results/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
      await svc.deleteHistoryItem(req.auth!.id, params.id);
      return ok(res, { deleted: true });
    } catch (err) { next(err); }
  });

  const admin = Router();
  admin.use(requirePermission(PERMISSIONS.GPA_MANAGE));

  admin.get('/profiles', async (_req, res, next) => {
    try {
      const items = await CalculationProfile.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
      return ok(res, { items });
    } catch (err) { next(err); }
  });

  admin.get('/profiles/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
      const profile = await CalculationProfile.findOne({ _id: new Types.ObjectId(params.id), deletedAt: null }).lean();
      if (!profile) throw notFound('Profile not found');
      return ok(res, { profile });
    } catch (err) { next(err); }
  });

  admin.post('/profiles', validate({ body: createProfileSchema }), async (req, res, next) => {
    try {
      const profile = await CalculationProfile.create({
        regulationId: new Types.ObjectId(req.body.regulationId),
        data: req.body.data,
        verification: req.body.verification ?? { sourceRefs: [] },
        createdBy: new Types.ObjectId(req.auth!.id)
      });
      return ok(res, { id: String(profile._id), status: profile.status }, 201);
    } catch (err) { next(err); }
  });

  admin.put('/profiles/:id', validate({ params: idParam, body: updateProfileSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
      const profile = await CalculationProfile.findOne({ _id: new Types.ObjectId(params.id), deletedAt: null });
      if (!profile) throw notFound('Profile not found');
      if (profile.status === 'published' || profile.status === 'retired') {
        throw conflict('Published or retired profiles cannot be edited; create a new version instead');
      }
      if (req.body.data) profile.data = req.body.data;
      if (req.body.verification) profile.verification = req.body.verification;
      await profile.save();
      await writeAudit({ actorId: req.auth!.id, action: 'gpa.profile.update', targetType: 'CalculationProfile', targetId: params.id, after: { version: profile.version, status: profile.status } });
      return ok(res, { id: String(profile._id), status: profile.status, version: profile.version });
    } catch (err) { next(err); }
  });

  admin.post('/profiles/:id/transition', validate({ params: idParam, body: transitionSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
      const profile = await svc.transitionProfile(params.id, req.body.to, req.auth!.id, req.body.note);
      return ok(res, { id: String(profile._id), status: profile.status });
    } catch (err) { next(err); }
  });

  admin.post('/profiles/:id/test-run', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
      const result = await svc.runProfileTestSuite(params.id, req.auth!.id);
      return ok(res, result);
    } catch (err) { next(err); }
  });

  router.use('/admin', admin);
  return router;
}
