import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';

type AnyModel = import('mongoose').Model<any>;
import { CommunityPost } from '../../models/community-post.model';
import { Exam } from '../../models/exam.model';
import { StudyMaterial } from '../../models/study-material.model';
import { BtebSubject } from '../../models/bteb-subject.model';
import { SearchHistory } from '../../models/search-history.model';
import { AppSettings } from '../../models/app-settings.model';
import { validate } from '../../middlewares/validate';
import { requireAuth, optionalAuth } from '../../middlewares/auth';
import { requirePermission } from '../../middlewares/rbac';
import { PERMISSIONS } from '../../core/permissions';
import { ok } from '../../core/response';
import type { Env } from '../../config/env';

const listSchema = z.object({
  q: z.string().trim().min(2).max(100),
  type: z.enum(['material', 'exam', 'post', 'subject']).optional()
});

const suggestSchema = z.object({
  q: z.string().trim().min(1).max(100)
});

const synonymsSchema = z.object({
  groups: z.array(z.array(z.string().trim().min(1).max(50)).min(2).max(10)).max(200)
});

type SearchQuery = z.infer<typeof listSchema>;
type Validated = { validatedQuery?: SearchQuery };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PER_TYPE_LIMIT = 10;
const PAGE_SIZE = 20;
const HISTORY_KEEP = 20;

type Scope = { model: AnyModel; filter: () => Record<string, unknown>; fields: string[] };

const excluded = { deletedAt: { $in: [null, undefined] } };

const scopes: Record<'material' | 'exam' | 'post' | 'subject', (rx: RegExp) => Scope> = {
  material: (rx) => ({
    model: StudyMaterial as unknown as AnyModel,
    fields: ['title', 'titleBn', 'description'],
    filter: () => ({ status: 'published', ...excluded })
  }),
  exam: (rx) => ({
    model: Exam as unknown as AnyModel,
    fields: ['title'],
    filter: () => ({ status: 'published', ...excluded })
  }),
  post: (rx) => ({
    model: CommunityPost as unknown as AnyModel,
    fields: ['title', 'body'],
    filter: () => ({ status: 'visible', ...excluded })
  }),
  subject: (rx) => ({
    model: BtebSubject as unknown as AnyModel,
    fields: ['name', 'nameBn', 'code'],
    filter: () => ({ ...excluded })
  })
};

async function getSynonymGroups(): Promise<string[][]> {
  const settings = await AppSettings.findOne().lean();
  return (settings?.searchSynonyms as string[][] | undefined) ?? [];
}

function expandTerms(q: string, groups: string[][]): string[] {
  const lower = q.toLowerCase();
  const terms = new Set<string>([q]);
  for (const group of groups) {
    if (group.some((term) => term.toLowerCase() === lower)) {
      for (const term of group) terms.add(term);
    }
  }
  return [...terms];
}

function textFilter(scope: Scope, terms: string[]): Record<string, unknown> {
  if (terms.length === 1) {
    const rx = new RegExp(escapeRegex(terms[0]), 'i');
    return { ...scope.filter(), $or: scope.fields.map((f) => ({ [f]: rx })) };
  }
  const ors = terms.flatMap((term) => {
    const rx = new RegExp(escapeRegex(term), 'i');
    return scope.fields.map((f) => ({ [f]: rx }));
  });
  return { ...scope.filter(), $or: ors };
}

async function recordHistory(userId: string, q: string, resultCount: number) {
  try {
    await SearchHistory.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), q },
      { $set: { searchedAt: new Date(), resultCount } },
      { upsert: true }
    );
    const stale = await SearchHistory.find({ userId: new Types.ObjectId(userId) })
      .sort({ searchedAt: -1 })
      .skip(HISTORY_KEEP)
      .select('_id')
      .lean();
    if (stale.length > 0) {
      await SearchHistory.deleteMany({ _id: { $in: stale.map((d) => d._id) } });
    }
  } catch {
    /* history recording must never break search */
  }
}

export function searchRoutes(env: Env) {
  const router = Router();
  router.use(optionalAuth(env.JWT_ACCESS_SECRET));

  router.get('/', validate({ query: listSchema }), async (req, res, next) => {
    try {
      const { q, type } = (req as unknown as Validated).validatedQuery!;
      const groups = await getSynonymGroups();
      const terms = expandTerms(q, groups);
      const rx = new RegExp(escapeRegex(q), 'i');

      if (type) {
        const scope = scopes[type](rx);
        const filter = textFilter(scope, terms);
        const page = Math.max(1, Number((req.query.page as string) ?? '') || 1);
        const [items, total] = await Promise.all([
          scope.model.find(filter).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).sort({ createdAt: -1 }).lean(),
          scope.model.countDocuments(filter)
        ]);
        return ok(
          res,
          { items },
          200,
          { page, limit: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
        );
      }

      const grouped: Record<string, { count: number; items: unknown[] }> = {};
      let totalResults = 0;
      await Promise.all(Object.entries(scopes).map(async ([key, make]) => {
        const scope = make(rx);
        const filter = textFilter(scope, terms);
        const [items, total] = await Promise.all([
          scope.model.find(filter).limit(PER_TYPE_LIMIT).sort({ createdAt: -1 }).lean(),
          scope.model.countDocuments(filter)
        ]);
        grouped[key] = { count: total, items };
        totalResults += total;
      }));
      if (req.auth) void recordHistory(req.auth.id, q, totalResults);
      return ok(res, { query: q, types: grouped });
    } catch (err) { next(err); }
  });

  router.get('/suggest', requireAuth(env.JWT_ACCESS_SECRET), validate({ query: suggestSchema }), async (req, res, next) => {
    try {
      const { q } = (req as unknown as Validated).validatedQuery!;
      const prefixRx = new RegExp(`^${escapeRegex(q)}`, 'i');
      const containsRx = new RegExp(escapeRegex(q), 'i');
      const userId = new Types.ObjectId(req.auth!.id);

      const [history, materials, subjects] = await Promise.all([
        SearchHistory.find({ userId, q: containsRx }).sort({ searchedAt: -1 }).limit(5).lean(),
        StudyMaterial.find({ status: 'published', ...excluded, title: prefixRx }).select('title').limit(5).lean(),
        BtebSubject.find({ ...excluded, name: prefixRx }).select('name').limit(4).lean()
      ]);

      const seen = new Set<string>();
      const suggestions: string[] = [];
      for (const item of [...history.map((h) => h.q as string), ...materials.map((m) => m.title as string), ...subjects.map((s) => s.name as string)]) {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push(item);
        }
      }
      return ok(res, { suggestions: suggestions.slice(0, 8) });
    } catch (err) { next(err); }
  });

  router.get('/history', requireAuth(env.JWT_ACCESS_SECRET), async (req, res, next) => {
    try {
      const items = await SearchHistory.find({ userId: new Types.ObjectId(req.auth!.id) })
        .sort({ searchedAt: -1 })
        .limit(HISTORY_KEEP)
        .lean();
      return ok(res, { items: items.map((i) => ({ q: i.q, resultCount: i.resultCount, searchedAt: i.searchedAt })) });
    } catch (err) { next(err); }
  });

  router.delete('/history', requireAuth(env.JWT_ACCESS_SECRET), async (req, res, next) => {
    try {
      await SearchHistory.deleteMany({ userId: new Types.ObjectId(req.auth!.id) });
      return ok(res, { cleared: true });
    } catch (err) { next(err); }
  });

  const admin = Router();
  admin.use(requirePermission(PERMISSIONS.SETTINGS_MANAGE));

  admin.get('/analytics', async (_req, res, next) => {
    try {
      const [top, zeroResult] = await Promise.all([
        SearchHistory.aggregate([
          { $group: { _id: '$q', count: { $sum: 1 }, avgResults: { $avg: '$resultCount' } } },
          { $sort: { count: -1 } },
          { $limit: 20 }
        ]),
        SearchHistory.aggregate([
          { $group: { _id: '$q', maxResults: { $max: '$resultCount' } } },
          { $match: { maxResults: 0 } },
          { $sort: { _id: 1 } },
          { $limit: 50 }
        ])
      ]);
      return ok(res, {
        topQueries: top.map((t) => ({ q: t._id, count: t.count, avgResults: Math.round(t.avgResults ?? 0) })),
        zeroResultQueries: zeroResult.map((zr) => zr._id)
      });
    } catch (err) { next(err); }
  });

  admin.get('/config', async (_req, res, next) => {
    try {
      const settings = await AppSettings.findOne().lean();
      return ok(res, { groups: (settings?.searchSynonyms as string[][] | undefined) ?? [] });
    } catch (err) { next(err); }
  });

  admin.put('/config', validate({ body: synonymsSchema }), async (req, res, next) => {
    try {
      let settings = await AppSettings.findOne();
      if (!settings) settings = await AppSettings.create({});
      settings.searchSynonyms = req.body.groups;
      await settings.save();
      return ok(res, { groups: settings.searchSynonyms });
    } catch (err) { next(err); }
  });

  router.use('/admin', admin);
  return router;
}
