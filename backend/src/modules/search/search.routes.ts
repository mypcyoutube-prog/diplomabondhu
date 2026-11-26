import { Router } from 'express';
import { z } from 'zod';

type AnyModel = import('mongoose').Model<any>;
import { CommunityPost } from '../../models/community-post.model';
import { Exam } from '../../models/exam.model';
import { StudyMaterial } from '../../models/study-material.model';
import { validate } from '../../middlewares/validate';
import { ok } from '../../core/response';

const listSchema = z.object({
  q: z.string().trim().min(2).max(100),
  type: z.enum(['material', 'exam', 'post']).optional()
});

type SearchQuery = z.infer<typeof listSchema>;
type Validated = { validatedQuery?: SearchQuery };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PER_TYPE_LIMIT = 10;
const PAGE_SIZE = 20;

type Scope = { model: AnyModel; filter: () => Record<string, unknown> };

const excluded = { deletedAt: { $in: [null, undefined] } };

const scopes: Record<'material' | 'exam' | 'post', (rx: RegExp) => Scope> = {
  material: (rx) => ({
    model: StudyMaterial as unknown as AnyModel,
    filter: () => ({ status: 'published', ...excluded, $or: [{ title: rx }, { titleBn: rx }, { description: rx }] })
  }),
  exam: (rx) => ({ model: Exam as unknown as AnyModel, filter: () => ({ status: 'published', ...excluded, title: rx }) }),
  post: (rx) => ({ model: CommunityPost as unknown as AnyModel, filter: () => ({ status: 'visible', ...excluded, $or: [{ title: rx }, { body: rx }] }) })
};

export function searchRoutes() {
  const router = Router();

  router.get('/', validate({ query: listSchema }), async (req, res, next) => {
    try {
      const { q, type } = (req as unknown as Validated).validatedQuery!;
      const rx = new RegExp(escapeRegex(q), 'i');

      if (type) {
        const scope = scopes[type](rx);
        const page = Math.max(1, Number((req.query.page as string) ?? '') || 1);
        const [items, total] = await Promise.all([
          scope.model.find(scope.filter()).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).sort({ createdAt: -1 }).lean(),
          scope.model.countDocuments(scope.filter())
        ]);
        return ok(
          res,
          { items },
          200,
          { page, limit: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
        );
      }

      const grouped: Record<string, { count: number; items: unknown[] }> = {};
      await Promise.all(Object.entries(scopes).map(async ([key, make]) => {
        const scope = make(rx);
        const [items, total] = await Promise.all([
          scope.model.find(scope.filter()).limit(PER_TYPE_LIMIT).sort({ createdAt: -1 }).lean(),
          scope.model.countDocuments(scope.filter())
        ]);
        grouped[key] = { count: total, items };
      }));
      return ok(res, { query: q, types: grouped });
    } catch (err) { next(err); }
  });

  return router;
}
