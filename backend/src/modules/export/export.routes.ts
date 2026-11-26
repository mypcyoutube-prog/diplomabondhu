import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ok, fail } from '../../core/response';
import { notFound, gone, forbidden } from '../../core/errors';
import { ExportJob, type ExportDataset, type ExportFormat } from '../../models/export-job.model';
import { WorkspaceNote } from '../../models/workspace-note.model';
import { WorkspaceCollection } from '../../models/workspace-collection.model';
import { Bookmark } from '../../models/bookmark.model';
import { Task } from '../../models/task.model';
import { Goal } from '../../models/goal.model';
import { CalculationHistory } from '../../models/calculation-history.model';
import { writeAudit } from '../../models/audit-log.model';

const DATASETS: ExportDataset[] = ['notes', 'bookmarks', 'collections', 'tasks', 'goals', 'calculation-history'];
const MAX_CONTENT_BYTES = 2 * 1024 * 1024;
const EXPIRY_DAYS = 7;
const MAX_ACTIVE_JOBS = 5;

const jobBodySchema = z.object({
  datasets: z.array(z.enum(DATASETS as [ExportDataset, ...ExportDataset[]])).min(1).max(DATASETS.length),
  format: z.enum(['json', 'csv'])
});

const idParam = z.object({ id: z.string().trim().min(1) });
type V<T> = { validatedParams?: T };

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const escape = (value: unknown): string => {
    const s = value === undefined || value === null ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(','));
  return lines.join('\n');
}

async function gatherDataset(dataset: ExportDataset, userId: Types.ObjectId): Promise<Record<string, unknown>[]> {
  switch (dataset) {
    case 'notes':
      return WorkspaceNote.find({ userId, deletedAt: null }).select('title body pinned archived createdAt updatedAt').lean();
    case 'bookmarks':
      return Bookmark.find({ userId, deletedAt: null }).populate('materialId', 'title type').lean();
    case 'collections':
      return WorkspaceCollection.find({ userId, deletedAt: null }).select('name items createdAt').lean();
    case 'tasks':
      return Task.find({ userId }).select('title status dueAt reminderAt createdAt updatedAt').lean();
    case 'goals':
      return Goal.find({ userId }).select('title status targetDate createdAt updatedAt').lean();
    case 'calculation-history':
      return CalculationHistory.find({ userId, deletedAt: null }).select('kind inputs output label createdAt').lean();
  }
}

async function buildContent(datasets: ExportDataset[], format: ExportFormat, userId: Types.ObjectId): Promise<string> {
  if (format === 'json') {
    const payload: Record<string, unknown> = { exportedAt: new Date().toISOString(), app: 'DiplomaBondhu' };
    for (const dataset of datasets) {
      payload[dataset] = await gatherDataset(dataset, userId);
    }
    return JSON.stringify(payload, null, 2);
  }
  const blocks: string[] = [];
  for (const dataset of datasets) {
    const rows = await gatherDataset(dataset, userId);
    const clean = rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        out[k] = v && typeof v === 'object' && !Array.isArray(v) && '_id' in (v as Record<string, unknown>) ? JSON.stringify(v) : v;
      }
      delete out.__v;
      return out;
    });
    blocks.push(`# ${dataset}\n${toCsv(clean)}`);
  }
  return blocks.join('\n\n');
}

export function exportRoutes(_env: Env) {
  const router = Router();
  router.use(requireAuth(_env.JWT_ACCESS_SECRET));

  router.post('/jobs', validate({ body: jobBodySchema }), async (req, res, next) => {
    try {
      const userId = new Types.ObjectId(req.auth!.id);
      const active = await ExportJob.countDocuments({
        userId,
        status: { $in: ['processing', 'ready'] },
        expiresAt: { $gt: new Date() }
      });
      if (active >= MAX_ACTIVE_JOBS) {
        return fail(res, 429, 'RATE_LIMITED', 'Too many active export jobs. Wait for existing exports to expire.');
      }

      const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const job = await ExportJob.create({
        userId,
        datasets: req.body.datasets,
        format: req.body.format,
        status: 'processing',
        fileName: `diplomabondhu-export-${Date.now()}.${req.body.format}`,
        content: '',
        expiresAt
      });

      try {
        const content = await buildContent(req.body.datasets, req.body.format, userId);
        if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_BYTES) {
          job.status = 'failed';
          job.error = 'Export too large. Reduce selected datasets and try again.';
          await job.save();
          return fail(res, 400, 'VALIDATION_ERROR', job.error);
        }
        job.content = content;
        job.status = 'ready';
        await job.save();
        await writeAudit({ actorId: String(userId), action: 'export.create', targetType: 'ExportJob', targetId: String(job._id), after: { datasets: req.body.datasets, format: req.body.format } });
      } catch (err) {
        job.status = 'failed';
        job.error = err instanceof Error ? err.message : 'Export failed';
        await job.save();
        throw err;
      }

      return ok(res, { item: { id: String(job._id), status: job.status, fileName: job.fileName, expiresAt: job.expiresAt, datasets: job.datasets, format: job.format } }, 201);
    } catch (err) { next(err); }
  });

  router.get('/jobs', async (req, res, next) => {
    try {
      const now = new Date();
      await ExportJob.updateMany(
        { userId: new Types.ObjectId(req.auth!.id), status: 'ready', expiresAt: { $lte: now } },
        { $set: { status: 'expired', content: '' } }
      );
      const items = await ExportJob.find({ userId: new Types.ObjectId(req.auth!.id) })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('-content')
        .lean();
      return ok(res, { items });
    } catch (err) { next(err); }
  });

  router.get('/jobs/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      if (!Types.ObjectId.isValid(params.id)) throw notFound('Export job not found');
      const job = await ExportJob.findOne({ _id: new Types.ObjectId(params.id), userId: new Types.ObjectId(req.auth!.id) })
        .select('-content')
        .lean();
      if (!job) throw notFound('Export job not found');
      if (job.status === 'ready' && job.expiresAt && new Date(job.expiresAt) <= new Date()) {
        await ExportJob.updateOne({ _id: job._id }, { $set: { status: 'expired', content: '' } });
        return ok(res, { item: { ...job, status: 'expired' } });
      }
      return ok(res, { item: job });
    } catch (err) { next(err); }
  });

  router.get('/jobs/:id/download', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      if (!Types.ObjectId.isValid(params.id)) throw notFound('Export job not found');
      const job = await ExportJob.findOne({ _id: new Types.ObjectId(params.id), userId: new Types.ObjectId(req.auth!.id) });
      if (!job) throw notFound('Export job not found');
      if (req.auth!.id !== String(job.userId)) throw forbidden();
      if (job.status === 'expired' || (job.expiresAt && job.expiresAt <= new Date())) {
        job.status = 'expired';
        job.content = '';
        await job.save();
        throw gone('This export has expired');
      }
      if (job.status !== 'ready' || !job.content) throw notFound('Export file is not ready');
      res.setHeader('content-type', job.format === 'json' ? 'application/json' : 'text/csv');
      res.setHeader('content-disposition', `attachment; filename="${job.fileName}"`);
      return res.status(200).send(job.content);
    } catch (err) { next(err); }
  });

  return router;
}
