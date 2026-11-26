import { Types } from 'mongoose';
import { notFound } from '../../core/errors';
import { Banner, type IBanner } from '../../models/banner.model';
import { writeAudit } from '../../models/audit-log.model';

export async function listActive() {
  const now = new Date();
  const filter: Record<string, unknown> = {
    status: 'published',
    deletedAt: null,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }
    ]
  };
  return Banner.find(filter).sort({ priority: -1, createdAt: -1 }).limit(10).lean();
}

export async function listAll(page: number, limit: number, status?: string) {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (status === 'draft' || status === 'published') filter.status = status;
  const [items, total] = await Promise.all([
    Banner.find(filter).sort({ priority: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Banner.countDocuments(filter)
  ]);
  return { items, meta: { page, limit, total } };
}

function toBannerDoc(id: string): Promise<IBanner | null> {
  if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
  return Banner.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
}

export async function createBanner(body: Record<string, unknown>, actorId: string, ip?: string, userAgent?: string) {
  const banner = await Banner.create({ ...body, status: 'draft', createdBy: new Types.ObjectId(actorId) });
  await writeAudit({ actorId, action: 'banner.create', targetType: 'Banner', targetId: String(banner._id), after: body, ip, userAgent });
  return banner;
}

export async function updateBanner(id: string, body: Record<string, unknown>, actorId: string, ip?: string, userAgent?: string) {
  const banner = await toBannerDoc(id);
  if (!banner) throw notFound('Banner not found');
  const before = banner.toObject();
  banner.set(body);
  await banner.save();
  await writeAudit({ actorId, action: 'banner.update', targetType: 'Banner', targetId: id, before, after: body, ip, userAgent });
  return banner;
}

export async function publishBanner(id: string, actorId: string, ip?: string, userAgent?: string) {
  const banner = await toBannerDoc(id);
  if (!banner) throw notFound('Banner not found');
  banner.set({ status: 'published' });
  await banner.save();
  await writeAudit({ actorId, action: 'banner.publish', targetType: 'Banner', targetId: id, ip, userAgent });
  return banner;
}

export async function unpublishBanner(id: string, actorId: string, ip?: string, userAgent?: string) {
  const banner = await toBannerDoc(id);
  if (!banner) throw notFound('Banner not found');
  banner.set({ status: 'draft' });
  await banner.save();
  await writeAudit({ actorId, action: 'banner.unpublish', targetType: 'Banner', targetId: id, ip, userAgent });
  return banner;
}

export async function deleteBanner(id: string, actorId: string, ip?: string, userAgent?: string) {
  const banner = await toBannerDoc(id);
  if (!banner) throw notFound('Banner not found');
  banner.set({ deletedAt: new Date() });
  await banner.save();
  await writeAudit({ actorId, action: 'banner.delete', targetType: 'Banner', targetId: id, ip, userAgent });
  return { deleted: true };
}
