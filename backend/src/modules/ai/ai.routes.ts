import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ok, fail } from '../../core/response';
import { notFound } from '../../core/errors';
import { getAiProvider } from '../../core/ai';
import { StudyPlan } from '../../models/study-plan.model';
import { AiUsageLog } from '../../models/ai-usage-log.model';
import { Task } from '../../models/task.model';

const generateSchema = z.object({
  subjects: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
  availableHoursPerDay: z.number().min(0.5).max(16),
  goal: z.string().trim().max(500).default(''),
  days: z.number().int().min(1).max(30).default(7)
});

const updateSchema = z.object({
  plan: z.record(z.string(), z.unknown()),
  status: z.enum(['draft', 'saved']).optional()
});

const idParam = z.object({ id: z.string().trim().min(1) });
type V<T> = { validatedParams?: T };

const SYSTEM_PROMPT = [
  'You are a study planner for Bangladeshi polytechnic diploma engineering students.',
  'Generate a suggested study schedule as strict JSON with this exact shape:',
  '{"days":[{"label":"Day 1","focus":"subject or topic","tasks":[{"title":"task","minutes":60}]}]}',
  'Rules:',
  '- Only use the subjects and goals the student provided.',
  '- Never invent official dates, exam deadlines or academic rules.',
  '- Total minutes per day must not exceed the available hours.',
  '- The plan is a suggestion only. Reply in Bangla where natural.'
].join('\n');

function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI response did not contain JSON');
  return JSON.parse(text.slice(start, end + 1));
}

export function aiRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  router.get('/status', async (_req, res, next) => {
    try {
      const provider = getAiProvider(env);
      return ok(res, {
        provider: provider.name,
        configured: provider.configured,
        planDailyLimit: env.AI_PLAN_DAILY_LIMIT
      });
    } catch (err) { next(err); }
  });

  router.post('/study-plan/generate', validate({ body: generateSchema }), async (req, res, next) => {
    try {
      const userId = new Types.ObjectId(req.auth!.id);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const usedToday = await AiUsageLog.countDocuments({
        userId,
        feature: 'study-plan',
        success: true,
        createdAt: { $gte: startOfDay }
      });
      if (usedToday >= env.AI_PLAN_DAILY_LIMIT) {
        return fail(res, 429, 'RATE_LIMITED', 'Daily AI study plan limit reached. Try again tomorrow.');
      }

      const provider = getAiProvider(env);
      const userPrompt = [
        `Subjects: ${req.body.subjects.join(', ')}`,
        `Available study time: ${req.body.availableHoursPerDay} hours per day`,
        `Goal: ${req.body.goal || 'general exam preparation'}`,
        `Plan length: ${req.body.days} days`,
        'Return only the JSON object.'
      ].join('\n');

      let plan: unknown;
      let tokensUsed = 0;
      try {
        const result = await provider.generate({ system: SYSTEM_PROMPT, user: userPrompt, maxTokens: 2000 });
        tokensUsed = result.tokensUsed;
        plan = extractJson(result.text);
        await AiUsageLog.create({ userId, feature: 'study-plan', tokensUsed, success: true });
      } catch (err) {
        await AiUsageLog.create({ userId, feature: 'study-plan', tokensUsed, success: false }).catch(() => undefined);
        throw err;
      }

      const created = await StudyPlan.create({
        userId,
        input: {
          subjects: req.body.subjects,
          availableHoursPerDay: req.body.availableHoursPerDay,
          goal: req.body.goal,
          days: req.body.days
        },
        plan,
        status: 'draft'
      });
      return ok(res, { item: created, estimated: true }, 201);
    } catch (err) { next(err); }
  });

  router.get('/study-plan', async (req, res, next) => {
    try {
      const items = await StudyPlan.find({ userId: new Types.ObjectId(req.auth!.id), deletedAt: null })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      return ok(res, { items: items.map((i) => ({ ...i, estimated: true })) });
    } catch (err) { next(err); }
  });

  router.put('/study-plan/:id', validate({ params: idParam, body: updateSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      if (!Types.ObjectId.isValid(params.id)) throw notFound('Study plan not found');
      const plan = await StudyPlan.findOneAndUpdate(
        { _id: new Types.ObjectId(params.id), userId: new Types.ObjectId(req.auth!.id), deletedAt: null },
        { $set: { plan: req.body.plan, ...(req.body.status ? { status: req.body.status } : {}) } },
        { new: true }
      );
      if (!plan) throw notFound('Study plan not found');
      return ok(res, { item: plan, estimated: true });
    } catch (err) { next(err); }
  });

  router.post('/study-plan/:id/apply', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      if (!Types.ObjectId.isValid(params.id)) throw notFound('Study plan not found');
      const plan = await StudyPlan.findOne({ _id: new Types.ObjectId(params.id), userId: new Types.ObjectId(req.auth!.id), deletedAt: null });
      if (!plan) throw notFound('Study plan not found');

      const payload = plan.plan as { days?: { tasks?: { title?: string }[] }[] } | undefined;
      const titles: string[] = [];
      for (const day of payload?.days ?? []) {
        for (const task of day.tasks ?? []) {
          if (task.title) titles.push(String(task.title));
        }
      }
      if (titles.length === 0) return fail(res, 400, 'VALIDATION_ERROR', 'Plan contains no tasks to apply');
      const created = await Task.insertMany(
        titles.slice(0, 100).map((title) => ({
          userId: new Types.ObjectId(req.auth!.id),
          title: title.slice(0, 200)
        })),
        { ordered: false }
      ) as unknown as { _id: unknown }[];
      plan.status = 'saved';
      await plan.save();
      return ok(res, { createdTasks: created.length, estimated: true }, 201);
    } catch (err) { next(err); }
  });

  router.delete('/study-plan/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const result = await StudyPlan.updateOne(
        { _id: new Types.ObjectId(params.id), userId: new Types.ObjectId(req.auth!.id), deletedAt: null },
        { $set: { deletedAt: new Date() } }
      );
      if (result.matchedCount === 0) throw notFound('Study plan not found');
      return ok(res, { deleted: true });
    } catch (err) { next(err); }
  });

  return router;
}
