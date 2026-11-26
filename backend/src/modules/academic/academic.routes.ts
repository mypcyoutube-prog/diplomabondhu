import { Router } from 'express';
import type { FilterQuery } from 'mongoose';
import { z } from 'zod';
import type { Model } from 'mongoose';

type AnyModel = Model<any>;
import { conflict } from '../../core/errors';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok, fail } from '../../core/response';
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
  uniqueFields?: string[];
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

  const adminEntities: Array<{ path: string; model: AnyModel; name: string; bodySchema: z.ZodObject<any>; uniqueFields?: string[] }> = [
    { path: '/programs', model: EducationProgram, name: 'EducationProgram', bodySchema: programBodySchema, uniqueFields: ['code'] },
    { path: '/regulations', model: Regulation, name: 'Regulation', bodySchema: regulationBodySchema, uniqueFields: ['programId', 'year'] },
    { path: '/institutes', model: Institute, name: 'Institute', bodySchema: instituteBodySchema, uniqueFields: ['code'] },
    { path: '/sessions', model: AcademicSession, name: 'AcademicSession', bodySchema: sessionBodySchema, uniqueFields: ['programId', 'regulationId', 'startYear'] },
    { path: '/technologies', model: Technology, name: 'Technology', bodySchema: technologyBodySchema, uniqueFields: ['programId', 'code'] },
    { path: '/semesters', model: Semester, name: 'Semester', bodySchema: semesterBodySchema, uniqueFields: ['programId', 'regulationId', 'number'] },
    { path: '/subjects', model: Subject, name: 'Subject', bodySchema: subjectBodySchema, uniqueFields: ['regulationId', 'code'] },
    { path: '/chapters', model: Chapter, name: 'Chapter', bodySchema: chapterBodySchema, uniqueFields: ['subjectId', 'number'] }
  ];

  for (const { path, model, name, bodySchema, uniqueFields } of adminEntities) {
    admin.post(path, validate({ body: bodySchema }), async (req, res, next) => {
      try {
        if (uniqueFields) {
          const probe: Record<string, FilterQuery<never>> = {};
          let complete = true;
          for (const f of uniqueFields) {
            const value = (req.body as Record<string, unknown>)[f];
            if (value === undefined || value === null) { complete = false; break; }
            probe[f] = value as FilterQuery<never>;
          }
          if (complete && await model.exists(probe)) {
            return fail(res, 409, 'CONFLICT', `Duplicate value for ${uniqueFields.join(', ')}`);
          }
        }
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
