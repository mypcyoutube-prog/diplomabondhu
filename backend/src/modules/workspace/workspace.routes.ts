import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import type { Env } from '../../config/env';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ok, fail } from '../../core/response';
import { conflict, notFound } from '../../core/errors';
import { WorkspaceNote } from '../../models/workspace-note.model';
import { WorkspaceCollection } from '../../models/workspace-collection.model';
import { MaterialView } from '../../models/material-view.model';
import { Bookmark } from '../../models/bookmark.model';
import { StudyMaterial } from '../../models/study-material.model';

const noteBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  collectionId: z.string().trim().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional()
});

const noteUpdateSchema = noteBodySchema.partial();

const collectionBodySchema = z.object({ name: z.string().trim().min(1).max(120) });

const itemBodySchema = z.object({
  refType: z.enum(['material', 'note']),
  refId: z.string().trim().min(1)
});

const itemRemoveSchema = z.object({
  refType: z.enum(['material', 'note']),
  refId: z.string().trim().min(1)
});

const idParam = z.object({ id: z.string().trim().min(1) });
type V<T> = { validatedQuery?: T; validatedParams?: T };

const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  archived: z.enum(['true', 'false']).optional(),
  collectionId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

function oid(value: string | undefined): Types.ObjectId | null {
  return value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
}

export function workspaceRoutes(env: Env) {
  const router = Router();
  router.use(requireAuth(env.JWT_ACCESS_SECRET));

  router.get('/notes', validate({ query: listQuerySchema }), async (req, res, next) => {
    try {
      const query = (req as unknown as V<z.infer<typeof listQuerySchema>>).validatedQuery!;
      const userId = new Types.ObjectId(req.auth!.id);
      const filter: Record<string, unknown> = { userId, deletedAt: null, archived: query.archived !== 'true' ? false : true };
      if (query.q) {
        const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ title: rx }, { body: rx }];
      }
      const cid = oid(query.collectionId);
      if (query.collectionId) {
        if (!cid) return fail(res, 400, 'VALIDATION_ERROR', 'Invalid collectionId');
        filter.collectionId = cid;
      }
      const [items, total] = await Promise.all([
        WorkspaceNote.find(filter)
          .sort({ pinned: -1, updatedAt: -1 })
          .skip((query.page - 1) * query.limit)
          .limit(query.limit)
          .lean(),
        WorkspaceNote.countDocuments(filter)
      ]);
      return ok(res, { items }, 200, { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) });
    } catch (err) { next(err); }
  });

  router.post('/notes', validate({ body: noteBodySchema }), async (req, res, next) => {
    try {
      const userId = new Types.ObjectId(req.auth!.id);
      if (req.body.collectionId) {
        const cid = oid(req.body.collectionId);
        if (!cid) return fail(res, 400, 'VALIDATION_ERROR', 'Invalid collectionId');
        const collection = await WorkspaceCollection.findOne({ _id: cid, userId, deletedAt: null });
        if (!collection) throw notFound('Collection not found');
      }
      const note = await WorkspaceNote.create({ ...req.body, userId });
      return ok(res, { item: note }, 201);
    } catch (err) { next(err); }
  });

  router.put('/notes/:id', validate({ params: idParam, body: noteUpdateSchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const userId = new Types.ObjectId(req.auth!.id);
      if (req.body.collectionId !== undefined && req.body.collectionId !== null && req.body.collectionId !== '') {
        const cid = oid(req.body.collectionId);
        if (!cid) return fail(res, 400, 'VALIDATION_ERROR', 'Invalid collectionId');
        const collection = await WorkspaceCollection.findOne({ _id: cid, userId, deletedAt: null });
        if (!collection) throw notFound('Collection not found');
      }
      const note = await WorkspaceNote.findOneAndUpdate(
        { _id: oid(params.id), userId, deletedAt: null },
        { $set: req.body },
        { new: true }
      );
      if (!note) throw notFound('Note not found');
      return ok(res, { item: note });
    } catch (err) { next(err); }
  });

  router.delete('/notes/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const result = await WorkspaceNote.updateOne(
        { _id: oid(params.id), userId: new Types.ObjectId(req.auth!.id), deletedAt: null },
        { $set: { deletedAt: new Date() } }
      );
      if (result.matchedCount === 0) throw notFound('Note not found');
      return ok(res, { deleted: true });
    } catch (err) { next(err); }
  });

  router.get('/collections', async (req, res, next) => {
    try {
      const items = await WorkspaceCollection.find({ userId: new Types.ObjectId(req.auth!.id), deletedAt: null })
        .sort({ updatedAt: -1 })
        .lean();
      return ok(res, { items });
    } catch (err) { next(err); }
  });

  router.post('/collections', validate({ body: collectionBodySchema }), async (req, res, next) => {
    try {
      const exists = await WorkspaceCollection.findOne({
        userId: new Types.ObjectId(req.auth!.id),
        name: req.body.name,
        deletedAt: null
      });
      if (exists) throw conflict('A collection with this name already exists');
      const collection = await WorkspaceCollection.create({ name: req.body.name, userId: new Types.ObjectId(req.auth!.id) });
      return ok(res, { item: collection }, 201);
    } catch (err) { next(err); }
  });

  router.delete('/collections/:id', validate({ params: idParam }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const result = await WorkspaceCollection.updateOne(
        { _id: oid(params.id), userId: new Types.ObjectId(req.auth!.id), deletedAt: null },
        { $set: { deletedAt: new Date() } }
      );
      if (result.matchedCount === 0) throw notFound('Collection not found');
      await WorkspaceNote.updateMany(
        { userId: new Types.ObjectId(req.auth!.id), collectionId: oid(params.id) },
        { $set: { collectionId: null } }
      );
      return ok(res, { deleted: true });
    } catch (err) { next(err); }
  });

  router.post('/collections/:id/items', validate({ params: idParam, body: itemBodySchema }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string }>).validatedParams!;
      const userId = new Types.ObjectId(req.auth!.id);
      const refId = oid(req.body.refId);
      if (!refId) return fail(res, 400, 'VALIDATION_ERROR', 'Invalid refId');
      const collection = await WorkspaceCollection.findOne({ _id: oid(params.id), userId, deletedAt: null });
      if (!collection) throw notFound('Collection not found');
      if (req.body.refType === 'material') {
        const material = await StudyMaterial.findOne({ _id: refId, status: 'published', deletedAt: null });
        if (!material) throw notFound('Material not found');
      } else {
        const note = await WorkspaceNote.findOne({ _id: refId, userId, deletedAt: null });
        if (!note) throw notFound('Note not found');
      }
      if (collection.items.some((i) => String(i.refId) === String(refId) && i.refType === req.body.refType)) {
        return ok(res, { item: collection });
      }
      collection.items.push({ refType: req.body.refType, refId, addedAt: new Date() });
      await collection.save();
      return ok(res, { item: collection }, 201);
    } catch (err) { next(err); }
  });

  router.delete('/collections/:id/items/:refId', validate({ params: z.object({ id: z.string().trim().min(1), refId: z.string().trim().min(1) }) }), async (req, res, next) => {
    try {
      const params = (req as unknown as V<{ id: string; refId: string }>).validatedParams!;
      const collection = await WorkspaceCollection.findOne({ _id: oid(params.id), userId: new Types.ObjectId(req.auth!.id), deletedAt: null });
      if (!collection) throw notFound('Collection not found');
      collection.items = collection.items.filter((i) => String(i.refId) !== params.refId);
      await collection.save();
      return ok(res, { item: collection });
    } catch (err) { next(err); }
  });

  router.get('/recent', async (req, res, next) => {
    try {
      const items = await MaterialView.find({ userId: new Types.ObjectId(req.auth!.id) })
        .sort({ viewedAt: -1 })
        .limit(20)
        .populate('materialId', 'title type')
        .lean();
      return ok(res, {
        items: items
          .filter((v) => v.materialId)
          .map((v) => ({ materialId: v.materialId, viewedAt: v.viewedAt, title: (v.materialId as unknown as { title?: string }).title, type: (v.materialId as unknown as { type?: string }).type }))
      });
    } catch (err) { next(err); }
  });

  router.get('/bookmarks', async (req, res, next) => {
    try {
      const items = await Bookmark.find({ userId: new Types.ObjectId(req.auth!.id) })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('materialId', 'title type')
        .lean();
      return ok(res, {
        items: items
          .filter((b) => b.materialId)
          .map((b) => ({ materialId: b.materialId, title: (b.materialId as unknown as { title?: string }).title, type: (b.materialId as unknown as { type?: string }).type, createdAt: b.createdAt }))
      });
    } catch (err) { next(err); }
  });

  return router;
}
