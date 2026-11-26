import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ok, fail } from '../../core/response';
import { notFound } from '../../core/errors';
import { SyncDevice } from '../../models/sync-device.model';
import { Bookmark } from '../../models/bookmark.model';
import { Task } from '../../models/task.model';
import { Goal } from '../../models/goal.model';
import { WorkspaceNote } from '../../models/workspace-note.model';

const deviceBodySchema = z.object({
  deviceId: z.string().trim().min(8).max(128),
  platform: z.string().trim().max(40).default('android'),
  name: z.string().trim().max(120).default('')
});

const idParam = z.object({ id: z.string().trim().min(1) });

const changesQuerySchema = z.object({
  since: z.string().trim().max(40).optional()
});

const pushOpSchema = z.object({
  collection: z.enum(['bookmarks', 'tasks', 'goals', 'notes']),
  clientUpdatedAt: z.string().min(1),
  data: z.record(z.string(), z.unknown()).nullable()
});

const pushSchema = z.object({
  deviceId: z.string().trim().min(8).max(128),
  ops: z.array(pushOpSchema).max(200)
});

const idField = z.string().trim().min(1);
type V<T> = { validatedQuery?: T; validatedParams?: T };

async function collectChanges(userId: Types.ObjectId, since: Date | undefined) {
  const range = since ? { updatedAt: { $gt: since } } : {};
  const [bookmarks, tasks, goals, notes] = await Promise.all([
    Bookmark.find({ userId, ...range }).populate('materialId', 'title type').lean(),
    Task.find({ userId, ...range }).lean(),
    Goal.find({ userId, ...range }).lean(),
    WorkspaceNote.find({ userId, deletedAt: null, ...range }).lean()
  ]);
  return {
    bookmarks: bookmarks.map((b) => ({ id: String(b._id), materialId: b.materialId, createdAt: b.createdAt, updatedAt: b.updatedAt })),
    tasks: tasks.map((t) => ({ ...t, id: String(t._id) })),
    goals: goals.map((g) => ({ ...g, id: String(g._id) })),
    notes: notes.map((n) => ({ ...n, id: String(n._id) }))
  };
}

export function syncRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  router.post('/devices', validate({ body: deviceBodySchema }), async (req, res, next) => {
    try {
      const device = await SyncDevice.findOneAndUpdate(
        { userId: new Types.ObjectId(req.auth!.id), deviceId: req.body.deviceId },
        { $set: { platform: req.body.platform, name: req.body.name, revokedAt: null } },
        { upsert: true, new: true }
      );
      return ok(res, { item: { id: String(device._id), deviceId: device.deviceId, lastSyncAt: device.lastSyncAt } }, 201);
    } catch (err) { next(err); }
  });

  router.get('/devices', async (req, res, next) => {
    try {
      const items = await SyncDevice.find({ userId: new Types.ObjectId(req.auth!.id), revokedAt: null })
        .sort({ updatedAt: -1 })
        .lean();
      return ok(res, {
        items: items.map((d) => ({ id: String(d._id), deviceId: d.deviceId, platform: d.platform, name: d.name, lastSyncAt: d.lastSyncAt, createdAt: d.createdAt }))
      });
    } catch (err) { next(err); }
  });

  router.delete('/devices/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const result = await SyncDevice.updateOne(
        { _id: new Types.ObjectId(params.id), userId: new Types.ObjectId(req.auth!.id) },
        { $set: { revokedAt: new Date() } }
      );
      if (result.matchedCount === 0) throw notFound('Device not found');
      return ok(res, { revoked: true });
    } catch (err) { next(err); }
  });

  router.get('/changes', validate({ query: changesQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as V<{ since?: string }>).validatedQuery!;
      let since: Date | undefined;
      if (query.since) {
        const parsed = new Date(query.since);
        if (Number.isNaN(parsed.getTime())) return fail(res, 400, 'VALIDATION_ERROR', 'Invalid since timestamp');
        since = parsed;
      }
      const userId = new Types.ObjectId(req.auth!.id);
      const changes = await collectChanges(userId, since);
      const now = new Date();
      await SyncDevice.updateMany({ userId, revokedAt: null }, { $set: { lastSyncAt: now } });
      return ok(res, { changes, serverTime: now });
    } catch (err) { next(err); }
  });

  router.post('/push', validate({ body: pushSchema }), async (req, res, next) => {
    try {
      const userId = new Types.ObjectId(req.auth!.id);
      const applied: string[] = [];
      const conflicts: string[] = [];
      for (const op of req.body.ops) {
        const clientUpdatedAt = new Date(op.clientUpdatedAt);
        if (Number.isNaN(clientUpdatedAt.getTime())) {
          conflicts.push('invalid clientUpdatedAt');
          continue;
        }
        if (op.collection === 'bookmarks') {
          conflicts.push('bookmarks are append-only via /materials/:id/bookmark');
          continue;
        }
        if (!op.data) {
          conflicts.push(`deletes are not supported via sync push for ${op.collection}`);
          continue;
        }
        const serverDoc = op.data.id ? await modelFor(op.collection).findOne({ _id: new Types.ObjectId(String(op.data.id)), userId }) : null;
        if (serverDoc && serverDoc.updatedAt && serverDoc.updatedAt > clientUpdatedAt) {
          conflicts.push(String(op.data.id));
          continue;
        }
        if (serverDoc) {
          const { id: _id, _v, ...rest } = op.data as Record<string, unknown>;
          void _id; void _v;
          serverDoc.set(rest as Record<string, unknown>);
          await serverDoc.save();
          applied.push(String(serverDoc._id));
        } else if (op.collection === 'notes') {
          const created = await WorkspaceNote.create({
            userId,
            title: String(op.data.title ?? 'Untitled'),
            body: String(op.data.body ?? ''),
            createdAt: clientUpdatedAt,
            updatedAt: clientUpdatedAt,
            ...(op.data.id ? { _id: new Types.ObjectId(String(op.data.id)) } : {})
          });
          applied.push(String(created._id));
        } else {
          conflicts.push('create is only supported for notes via sync push');
        }
      }
      await SyncDevice.updateOne(
        { userId: new Types.ObjectId(req.auth!.id), deviceId: req.body.deviceId },
        { $set: { lastSyncAt: new Date() } }
      );
      return ok(res, { applied, conflicts });
    } catch (err) { next(err); }
  });

  return router;
}

function modelFor(collection: 'bookmarks' | 'tasks' | 'goals' | 'notes'): import('mongoose').Model<any> {
  switch (collection) {
    case 'tasks': return Task as unknown as import('mongoose').Model<any>;
    case 'goals': return Goal as unknown as import('mongoose').Model<any>;
    case 'notes': return WorkspaceNote as unknown as import('mongoose').Model<any>;
    case 'bookmarks': return Bookmark as unknown as import('mongoose').Model<any>;
  }
}
