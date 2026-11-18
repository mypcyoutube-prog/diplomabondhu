import { FilterQuery, Model, Types } from 'mongoose';

type AnyModel = Model<any>;
import { notFound } from '../../core/errors';

export interface ListOptions {
  page?: number;
  limit?: number;
  programId?: string;
  regulationId?: string;
  technologyId?: string;
  semesterId?: string;
  subjectId?: string;
  q?: string;
  district?: string;
}

const ID_FIELDS = ['programId', 'regulationId', 'technologyId', 'semesterId', 'subjectId'] as const;

export function buildFilter(opts: ListOptions): FilterQuery<never> {
  const filter: Record<string, unknown> = { deletedAt: { $in: [null, undefined] } };
  for (const f of ID_FIELDS) {
    if (opts[f]) filter[f] = new Types.ObjectId(opts[f]);
  }
  if (opts.district) filter.district = opts.district;
  if (opts.q) {
    const escaped = opts.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: escaped, $options: 'i' } }, { code: { $regex: escaped, $options: 'i' } }];
  }
  return filter as FilterQuery<never>;
}

export async function listPaginated<T extends AnyModel>(model: T, opts: ListOptions) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const filter = buildFilter(opts);
  const [items, total] = await Promise.all([
    model.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).lean(),
    model.countDocuments(filter)
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function getById<T extends AnyModel>(model: T, id: string): Promise<Record<string, unknown>> {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const doc = await model.findOne({ _id: new Types.ObjectId(id), deletedAt: { $in: [null, undefined] } }).lean() as Record<string, unknown> | null;
  if (!doc) throw notFound();
  return doc;
}

export async function createDoc<T extends AnyModel>(model: T, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const doc = await model.create(data);
  return doc.toObject() as Record<string, unknown>;
}

export async function updateDoc<T extends AnyModel>(model: T, id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const doc = await model.findByIdAndUpdate(new Types.ObjectId(id), { $set: data }, { new: true, runValidators: true }).lean() as Record<string, unknown> | null;
  if (!doc) throw notFound();
  return doc;
}

export async function softDeleteDoc<T extends AnyModel>(model: T, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const result = await model.findByIdAndUpdate(new Types.ObjectId(id), { $set: { deletedAt: new Date() } });
  if (!result) throw notFound();
}
