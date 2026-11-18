import { Router } from 'express';
import { z } from 'zod';
import type { Model } from 'mongoose';

type AnyModel = Model<any>;
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { PERMISSIONS } from '../../core/permissions';
import { writeAudit } from '../../models/audit-log.model';
import { Institute, EducationProgram, Regulation, AcademicSession, Technology, Semester, Subject, Chapter } from '../../models/academic.models';
import * as svc from './academic.service';
import {
  chapterBodySchema, idParam, instituteBodySchema, listQuerySchema,
  programBodySchema, regulationBodySchema, semesterBodySchema, sessionBodySchema,
  subjectBodySchema, technologyBodySchema
} from './academic.schemas';

interface EntityConfig {
  model: AnyModel;
  name: string;
  bodySchema: z.ZodObject<any>;
}

export function academicRoutes(env: Env) {
  const router = Router();

  const publicEntities: Array<{ path: string; model: AnyModel }> = [
    { path: '/programs', model: EducationProgram },
    { path: '/regulations', model: Regulation },
    { path: '/institutes', model: Institute },
    { path: '/sessions', model: AcademicSession },
    { path: '/technologies', model: Technology },
    { path: '/semesters', model: Semester },
    { path: '/subjects', model: Subject },
    { path: '/chapters', model: Chapter }
  ];

  for (const { path, model } of publicEntities) {
    router.get(path, validate({ query: listQuerySchema }), async (req, res, next) => {
      try {
        const query = (req as unknown as { validatedQuery: svc.ListOptions }).validatedQuery;
        const { items, meta } = await svc.listPaginated(model, query);
        return ok(res, { items }, 200, meta);
      } catch (err) { next(err); }
    });

    router.get(`${path}/:id`, validate({ params: idParam }), async (req, res, next) => {
      try {
        const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
        const item = await svc.getById(model, params.id);
        return ok(res, { item });
      } catch (err) { next(err); }
    });
  }

  const admin = Router();
  admin.use(requireAuth(env.JWT_ACCESS_SECRET), requirePermission(PERMISSIONS.ACADEMIC_MANAGE));

  const adminEntities: Array<{ path: string; model: AnyModel; name: string; bodySchema: z.ZodObject<any> }> = [
    { path: '/programs', model: EducationProgram, name: 'EducationProgram', bodySchema: programBodySchema },
    { path: '/regulations', model: Regulation, name: 'Regulation', bodySchema: regulationBodySchema },
    { path: '/institutes', model: Institute, name: 'Institute', bodySchema: instituteBodySchema },
    { path: '/sessions', model: AcademicSession, name: 'AcademicSession', bodySchema: sessionBodySchema },
    { path: '/technologies', model: Technology, name: 'Technology', bodySchema: technologyBodySchema },
    { path: '/semesters', model: Semester, name: 'Semester', bodySchema: semesterBodySchema },
    { path: '/subjects', model: Subject, name: 'Subject', bodySchema: subjectBodySchema },
    { path: '/chapters', model: Chapter, name: 'Chapter', bodySchema: chapterBodySchema }
  ];

  for (const { path, model, name, bodySchema } of adminEntities) {
    admin.post(path, validate({ body: bodySchema }), async (req, res, next) => {
      try {
        const item = await svc.createDoc(model, req.body);
        await writeAudit({ actorId: req.auth!.id, action: `academic.${name}.created`, targetType: name, targetId: String((item as { _id: unknown })._id), after: item, ip: req.ip });
        return ok(res, { item }, 201);
      } catch (err) { next(err); }
    });

    admin.patch(`${path}/:id`, validate({ params: idParam, body: bodySchema.partial() }), async (req, res, next) => {
      try {
        const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
        const item = await svc.updateDoc(model, params.id, req.body);
        await writeAudit({ actorId: req.auth!.id, action: `academic.${name}.updated`, targetType: name, targetId: params.id, after: item, ip: req.ip });
        return ok(res, { item });
      } catch (err) { next(err); }
    });

    admin.delete(`${path}/:id`, validate({ params: idParam }), async (req, res, next) => {
      try {
        const params = (req as unknown as { validatedParams: { id: string } }).validatedParams;
        await svc.softDeleteDoc(model, params.id);
        await writeAudit({ actorId: req.auth!.id, action: `academic.${name}.deleted`, targetType: name, targetId: params.id, ip: req.ip });
        return ok(res, { deleted: true });
      } catch (err) { next(err); }
    });
  }

  router.use('/admin', admin);
  return router;
}
