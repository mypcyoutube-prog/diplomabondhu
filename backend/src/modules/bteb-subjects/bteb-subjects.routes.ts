import express, { Router } from 'express';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';
import { PERMISSIONS } from '../../core/permissions';
import { writeAudit } from '../../models/audit-log.model';
import { BtebSubject } from '../../models/bteb-subject.model';
import * as svc from './bteb-subjects.service';
import {
  catalogImportBodySchema, catalogQuerySchema, namesQuerySchema,
  subjectListQuerySchema, type CatalogImportBody, type CatalogQuery,
  type NamesQuery, type SubjectListQuery
} from './bteb-subjects.schemas';

type Validated<Q, B> = { validatedQuery?: Q; validatedBody?: B };

export function btebSubjectsRoutes(env: Env) {
  const router = Router();

  router.get('/technologies', validate({ query: catalogQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as Validated<CatalogQuery, never>).validatedQuery!;
      return ok(res, { technologies: await svc.listTechnologies(query.regulation) });
    } catch (err) { next(err); }
  });

  router.get('/subjects', validate({ query: subjectListQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as Validated<SubjectListQuery, never>).validatedQuery!;
      const { items, meta } = await svc.listSubjects(query);
      return ok(res, { items }, 200, meta);
    } catch (err) { next(err); }
  });

  router.get('/names', requireAuth(env.JWT_ACCESS_SECRET), validate({ query: namesQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as Validated<NamesQuery, never>).validatedQuery!;
      const codes = query.codes.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 60);
      const names = await svc.resolveSubjectNames(codes);
      return ok(res, { names: [...names.entries()].map(([code, v]) => ({ code, name: v.name })) });
    } catch (err) { next(err); }
  });

  router.post(
    '/admin/import',
    requireAuth(env.JWT_ACCESS_SECRET),
    requirePermission(PERMISSIONS.ACADEMIC_MANAGE),
    express.json({ limit: '12mb' }),
    validate({ body: catalogImportBodySchema }) as Parameters<Router['post']>[1],
    async (req, res, next) => {
      try {
        const body = req.body as CatalogImportBody;
        const ops: Record<string, unknown>[] = [];
        for (const tech of body.technologies) {
          for (const sem of tech.semesters) {
            const rows = [
              ...sem.subjects.map((s) => ({ ...s })),
              ...(sem.optionalSubjects ?? []).map((s) => ({ ...s }))
            ];
            for (const s of rows) {
              ops.push({
                replaceOne: {
                  filter: {
                    regulation: body.regulation,
                    technologySlug: tech.slug.toLowerCase(),
                    semester: sem.semester,
                    code: s.code.toUpperCase()
                  },
                  replacement: {
                    technology: tech.name.trim(),
                    technologySlug: tech.slug.toLowerCase(),
                    regulation: body.regulation,
                    semester: sem.semester,
                    groupCode: sem.group?.code?.toUpperCase() ?? null,
                    groupLabel: sem.group?.label ?? null,
                    code: s.code.toUpperCase(),
                    name: s.name,
                    credits: s.credit ?? null,
                    theoryMaxMarks: s.theoryMaxMarks ?? null,
                    practicalMaxMarks: s.practicalMaxMarks ?? null,
                    ppwTheory: s.ppwTheory ?? null,
                    ppwPractical: s.ppwPractical ?? null,
                    type: s.type ?? null
                  },
                  upsert: true
                }
              });
            }
          }
        }
        if (ops.length === 0) {
          return ok(res, { upserted: 0, technologies: 0 });
        }
        let matched = 0;
        for (let i = 0; i < ops.length; i += 500) {
          const chunk = await BtebSubject.bulkWrite(ops.slice(i, i + 500) as never, { ordered: false });
          matched += chunk.upsertedCount + chunk.matchedCount;
        }
        await writeAudit({
          actorId: req.auth!.id,
          action: 'bteb_subjects.imported',
          targetType: 'BtebSubject',
          targetId: String(body.regulation),
          after: { regulation: body.regulation, rows: ops.length, technologies: body.technologies.length },
          ip: req.ip
        });
        return ok(res, { upserted: matched, technologies: body.technologies.length, rows: ops.length });
      } catch (err) { next(err); }
    }
  );

  return router;
}
