import mongoose, { Types } from 'mongoose';
import { notFound, validationError } from '../../core/errors';
import { isIconAllowed, isRouteAllowed } from '../../core/whitelists';
import { writeAudit } from '../../models/audit-log.model';
import { Banner } from '../../models/banner.model';
import { CommunityPost } from '../../models/community-post.model';
import { Exam } from '../../models/exam.model';
import { HomeConfiguration, type IHomeConfiguration } from '../../models/home-configuration.model';
import { QuickAccessItem, type IQuickAccessItem } from '../../models/quick-access-item.model';
import { Announcement } from '../../models/announcement.model';
import { StudyMaterial } from '../../models/study-material.model';
import { StudyResourceCategory, type IStudyResourceCategory } from '../../models/study-resource-category.model';
import { AppSettings } from '../../models/app-settings.model';
import { withVersionBump } from '../../core/with-version-bump';

type Rec = Record<string, unknown>;

function assertIconRoute(icon: unknown, route: unknown) {
  if (typeof icon !== 'string' || !isIconAllowed(icon)) {
    throw validationError(`Unknown icon "${String(icon)}"; not in the verified Flutter icon whitelist`);
  }
  if (typeof route !== 'string' || !isRouteAllowed(route)) {
    throw validationError(`Unknown route "${String(route)}"; not in the GoRouter route whitelist`);
  }
}

function assertSlugFree(Model: mongoose.Model<any, any, any, any>, slug: string, excludeId?: string) {
  // Duplicate check covers active docs; soft-deleted docs keep their slug
  // (unique partial index) so a slug in the trash cannot be reused silently.
  return Model.findOne({ slug, deletedAt: null, ...(excludeId ? { _id: { $ne: new Types.ObjectId(excludeId) } } : {}) });
}

function contentFields(body: Rec): Rec {
  const allowed = ['slug', 'titleEn', 'titleBn', 'subtitleEn', 'subtitleBn', 'icon', 'route', 'bgColor', 'fgColor', 'materialTypes', 'displayOrder', 'status', 'scheduledAt', 'visibility'];
  const out: Rec = {};
  for (const k of allowed) if (k in body) out[k] = body[k];
  return out;
}

/* ---------------- Quick Access ---------------- */

export async function listQuickAccess(query: { page: number; limit: number; status?: string; q?: string }) {
  const filter: Rec = { deletedAt: null };
  if (query.status === 'archived') filter.archived = true;
  else if (query.status) { filter.status = query.status; filter.archived = false; }
  if (query.q) filter.$or = [{ titleEn: { $regex: query.q, $options: 'i' } }, { titleBn: { $regex: query.q, $options: 'i' } }, { slug: { $regex: query.q, $options: 'i' } }];
  const [items, total] = await Promise.all([
    QuickAccessItem.find(filter).sort({ displayOrder: 1, createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    QuickAccessItem.countDocuments(filter)
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total } };
}

export async function createQuickAccess(body: Rec, actorId: string) {
  assertIconRoute(body.icon, body.route);
  if (await assertSlugFree(QuickAccessItem, String(body.slug))) throw validationError('Slug already exists');
  const item = await QuickAccessItem.create({ ...contentFields(body), createdBy: new Types.ObjectId(actorId), updatedBy: new Types.ObjectId(actorId) });
  await writeAudit({ actorId, action: 'home.quick_access.create', targetType: 'QuickAccessItem', targetId: String(item._id), after: { slug: item.slug } });
  return item;
}

export async function updateQuickAccess(id: string, body: Rec, actorId: string) {
  const item = await QuickAccessItem.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!item) throw notFound('Quick access item not found');
  if ('icon' in body || 'route' in body) assertIconRoute(body.icon ?? item.icon, body.route ?? item.route);
  if ('slug' in body && body.slug !== item.slug && (await assertSlugFree(QuickAccessItem, String(body.slug), id))) throw validationError('Slug already exists');
  item.set(contentFields(body));
  item.updatedBy = new Types.ObjectId(actorId);
  await item.save();
  await writeAudit({ actorId, action: 'home.quick_access.update', targetType: 'QuickAccessItem', targetId: id, after: body });
  return item;
}

export async function setQuickAccessStatus(id: string, status: 'draft' | 'published' | 'scheduled', actorId: string) {
  const item = await QuickAccessItem.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!item) throw notFound('Quick access item not found');
  item.status = status;
  item.updatedBy = new Types.ObjectId(actorId);
  await item.save();
  await writeAudit({ actorId, action: `home.quick_access.${status}`, targetType: 'QuickAccessItem', targetId: id, after: { status } });
  return item;
}

export async function scheduleQuickAccess(id: string, scheduledAt: Date, actorId: string) {
  const item = await QuickAccessItem.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!item) throw notFound('Quick access item not found');
  item.status = 'scheduled';
  item.scheduledAt = scheduledAt;
  item.updatedBy = new Types.ObjectId(actorId);
  await item.save();
  await writeAudit({ actorId, action: 'home.quick_access.schedule', targetType: 'QuickAccessItem', targetId: id, after: { scheduledAt } });
  return item;
}

export async function setQuickAccessVisibility(id: string, visibility: boolean, actorId: string) {
  const item = await QuickAccessItem.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!item) throw notFound('Quick access item not found');
  item.visibility = visibility;
  item.updatedBy = new Types.ObjectId(actorId);
  await item.save();
  await writeAudit({ actorId, action: 'home.quick_access.visibility', targetType: 'QuickAccessItem', targetId: id, after: { visibility } });
  return item;
}

export async function archiveQuickAccess(id: string, actorId: string, archived: boolean) {
  const item = await QuickAccessItem.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!item) throw notFound('Quick access item not found');
  item.archived = archived;
  item.updatedBy = new Types.ObjectId(actorId);
  await item.save();
  await writeAudit({ actorId, action: archived ? 'home.quick_access.archive' : 'home.quick_access.unarchive', targetType: 'QuickAccessItem', targetId: id });
  return item;
}

export async function deleteQuickAccess(id: string, actorId: string) {
  const result = await QuickAccessItem.updateOne(
    { _id: new Types.ObjectId(id), deletedAt: null },
    withVersionBump({ $set: { deletedAt: new Date(), status: 'draft', visibility: false }, $unset: { createdByBatch: '' } })
  );
  if (result.matchedCount === 0) throw notFound('Quick access item not found');
  await writeAudit({ actorId, action: 'home.quick_access.delete', targetType: 'QuickAccessItem', targetId: id });
  return { deleted: true };
}

export async function restoreQuickAccess(id: string, actorId: string) {
  const result = await QuickAccessItem.updateOne(
    { _id: new Types.ObjectId(id), deletedAt: { $ne: null } },
    withVersionBump({ $set: { deletedAt: null } })
  );
  if (result.matchedCount === 0) throw notFound('Soft-deleted quick access item not found');
  await writeAudit({ actorId, action: 'home.quick_access.restore', targetType: 'QuickAccessItem', targetId: id });
  return { restored: true };
}

export async function reorderQuickAccess(items: { id: string; displayOrder: number }[], actorId: string) {
  for (const { id, displayOrder } of items) {
    await QuickAccessItem.updateOne(
      { _id: new Types.ObjectId(id), deletedAt: null },
      withVersionBump({ $set: { displayOrder, updatedBy: new Types.ObjectId(actorId) } })
    );
  }
  await writeAudit({ actorId, action: 'home.quick_access.reorder', targetType: 'QuickAccessItem', targetId: items.map((i) => i.id).join(',') });
  return { reordered: items.length };
}

/* ---------------- Study Resources ---------------- */

export async function listStudyResources(query: { page: number; limit: number; status?: string; q?: string }) {
  const filter: Rec = { deletedAt: null };
  if (query.status === 'archived') filter.archived = true;
  else if (query.status) { filter.status = query.status; filter.archived = false; }
  if (query.q) filter.$or = [{ titleEn: { $regex: query.q, $options: 'i' } }, { titleBn: { $regex: query.q, $options: 'i' } }, { slug: { $regex: query.q, $options: 'i' } }];
  const [items, total] = await Promise.all([
    StudyResourceCategory.find(filter).sort({ displayOrder: 1, createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    StudyResourceCategory.countDocuments(filter)
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total } };
}

export async function createStudyResource(body: Rec, actorId: string) {
  assertIconRoute(body.icon, body.route);
  if (await assertSlugFree(StudyResourceCategory, String(body.slug))) throw validationError('Slug already exists');
  const item = await StudyResourceCategory.create({ ...contentFields(body), createdBy: new Types.ObjectId(actorId), updatedBy: new Types.ObjectId(actorId) });
  await writeAudit({ actorId, action: 'home.study_resource.create', targetType: 'StudyResourceCategory', targetId: String(item._id), after: { slug: item.slug } });
  return item;
}

export async function updateStudyResource(id: string, body: Rec, actorId: string) {
  const item = await StudyResourceCategory.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!item) throw notFound('Study resource category not found');
  if ('icon' in body || 'route' in body) assertIconRoute(body.icon ?? item.icon, body.route ?? item.route);
  if ('slug' in body && body.slug !== item.slug && (await assertSlugFree(StudyResourceCategory, String(body.slug), id))) throw validationError('Slug already exists');
  item.set(contentFields(body));
  item.updatedBy = new Types.ObjectId(actorId);
  await item.save();
  await writeAudit({ actorId, action: 'home.study_resource.update', targetType: 'StudyResourceCategory', targetId: id, after: body });
  return item;
}

export async function setStudyResourceStatus(id: string, status: 'draft' | 'published' | 'scheduled', actorId: string) {
  const item = await StudyResourceCategory.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!item) throw notFound('Study resource category not found');
  item.status = status;
  item.updatedBy = new Types.ObjectId(actorId);
  await item.save();
  await writeAudit({ actorId, action: `home.study_resource.${status}`, targetType: 'StudyResourceCategory', targetId: id });
  return item;
}

export async function setStudyResourceVisibility(id: string, visibility: boolean, actorId: string) {
  const item = await StudyResourceCategory.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!item) throw notFound('Study resource category not found');
  item.visibility = visibility;
  item.updatedBy = new Types.ObjectId(actorId);
  await item.save();
  await writeAudit({ actorId, action: 'home.study_resource.visibility', targetType: 'StudyResourceCategory', targetId: id });
  return item;
}

export async function archiveStudyResource(id: string, actorId: string, archived: boolean) {
  const item = await StudyResourceCategory.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!item) throw notFound('Study resource category not found');
  item.archived = archived;
  item.updatedBy = new Types.ObjectId(actorId);
  await item.save();
  await writeAudit({ actorId, action: archived ? 'home.study_resource.archive' : 'home.study_resource.unarchive', targetType: 'StudyResourceCategory', targetId: id });
  return item;
}

export async function deleteStudyResource(id: string, actorId: string) {
  const result = await StudyResourceCategory.updateOne(
    { _id: new Types.ObjectId(id), deletedAt: null },
    withVersionBump({ $set: { deletedAt: new Date(), status: 'draft', visibility: false }, $unset: { createdByBatch: '' } })
  );
  if (result.matchedCount === 0) throw notFound('Study resource category not found');
  await writeAudit({ actorId, action: 'home.study_resource.delete', targetType: 'StudyResourceCategory', targetId: id });
  return { deleted: true };
}

export async function restoreStudyResource(id: string, actorId: string) {
  const result = await StudyResourceCategory.updateOne(
    { _id: new Types.ObjectId(id), deletedAt: { $ne: null } },
    withVersionBump({ $set: { deletedAt: null } })
  );
  if (result.matchedCount === 0) throw notFound('Soft-deleted study resource category not found');
  await writeAudit({ actorId, action: 'home.study_resource.restore', targetType: 'StudyResourceCategory', targetId: id });
  return { restored: true };
}

export async function reorderStudyResources(items: { id: string; displayOrder: number }[], actorId: string) {
  for (const { id, displayOrder } of items) {
    await StudyResourceCategory.updateOne(
      { _id: new Types.ObjectId(id), deletedAt: null },
      withVersionBump({ $set: { displayOrder, updatedBy: new Types.ObjectId(actorId) } })
    );
  }
  await writeAudit({ actorId, action: 'home.study_resource.reorder', targetType: 'StudyResourceCategory', targetId: items.map((i) => i.id).join(',') });
  return { reordered: items.length };
}

/* ---------------- Home Configuration ---------------- */

export async function listHomeConfig() {
  return HomeConfiguration.find({ deletedAt: null }).sort({ displayOrder: 1 }).lean();
}

export async function upsertHomeConfig(body: { key: string; visible?: boolean; displayOrder?: number; maxItems?: number }, actorId: string) {
  const doc = await HomeConfiguration.findOneAndUpdate(
    { key: body.key, deletedAt: null },
    { $set: { visible: body.visible ?? true, displayOrder: body.displayOrder ?? 0, maxItems: body.maxItems ?? 10, updatedBy: new Types.ObjectId(actorId) }, $inc: { __v: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await writeAudit({ actorId, action: 'home.configuration.upsert', targetType: 'HomeConfiguration', targetId: String(doc._id), after: body });
  return doc;
}

export async function updateHomeConfig(id: string, body: { visible?: boolean; displayOrder?: number; maxItems?: number }, actorId: string) {
  const doc = await HomeConfiguration.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!doc) throw notFound('Home configuration not found');
  if (body.visible !== undefined) doc.visible = body.visible;
  if (body.displayOrder !== undefined) doc.displayOrder = body.displayOrder;
  if (body.maxItems !== undefined) doc.maxItems = body.maxItems;
  doc.updatedBy = new Types.ObjectId(actorId);
  await doc.save();
  await writeAudit({ actorId, action: 'home.configuration.update', targetType: 'HomeConfiguration', targetId: id, after: body });
  return doc;
}

export async function deleteHomeConfig(id: string, actorId: string) {
  const result = await HomeConfiguration.updateOne(
    { _id: new Types.ObjectId(id), deletedAt: null },
    withVersionBump({ $set: { deletedAt: new Date(), visible: false } })
  );
  if (result.matchedCount === 0) throw notFound('Home configuration not found');
  await writeAudit({ actorId, action: 'home.configuration.delete', targetType: 'HomeConfiguration', targetId: id });
  return { deleted: true };
}

/* ---------------- Welcome configuration (AppSettings additive) ---------------- */

export async function getWelcome() {
  let settings = await AppSettings.findOne();
  if (!settings) settings = await AppSettings.create({});
  return settings.welcome;
}

export async function updateWelcome(body: { messageEn?: string; messageBn?: string; visible?: boolean }, actorId: string) {
  let settings = await AppSettings.findOne();
  if (!settings) settings = await AppSettings.create({});
  if (body.messageEn !== undefined) settings.welcome.messageEn = body.messageEn;
  if (body.messageBn !== undefined) settings.welcome.messageBn = body.messageBn;
  if (body.visible !== undefined) settings.welcome.visible = body.visible;
  await settings.save();
  await writeAudit({ actorId, action: 'home.welcome.update', targetType: 'AppSettings', targetId: String(settings._id), after: body });
  return settings.welcome;
}

/* ---------------- Public home content ---------------- */

function isLive(status: string, scheduledAt: Date | null | undefined): boolean {
  if (status === 'published') return true;
  if (status === 'scheduled') return !!scheduledAt && scheduledAt.getTime() <= Date.now();
  return false;
}

async function materialCount(types: string[]): Promise<number> {
  return StudyMaterial.countDocuments({ type: { $in: types }, status: 'published', deletedAt: null });
}

export async function getPublicHomeContent() {
  const [quickAccessItems, studyResources, sections, settings, notices, exams, featured] = await Promise.all([
    QuickAccessItem.find({ deletedAt: null, archived: false, visibility: true }).sort({ displayOrder: 1 }).lean(),
    StudyResourceCategory.find({ deletedAt: null, archived: false, visibility: true }).sort({ displayOrder: 1 }).lean(),
    HomeConfiguration.find({ deletedAt: null }).sort({ displayOrder: 1 }).lean(),
    AppSettings.findOne(),
    Announcement.find({ status: 'published', deletedAt: null, visible: { $ne: false } }).sort({ publishedAt: -1, createdAt: -1 }).limit(10).select('title body source pdfUrl publishedAt createdAt').lean(),
    Exam.find({ status: 'published', deletedAt: null, scheduledAt: { $ne: null, $gte: new Date() } }).sort({ scheduledAt: 1 }).limit(5).select('title description type durationSec scheduledAt').lean(),
    CommunityPost.find({ featured: true, status: 'visible', deletedAt: null }).sort({ featuredAt: -1 }).limit(5).select('title body tags type likeCount commentCount featuredAt createdAt authorId').populate<{ authorId: { name?: string } | null }>('authorId', 'name').lean()
  ]);

  const quickAccess = quickAccessItems.filter((i) => isLive(i.status, i.scheduledAt));
  const liveResources = studyResources.filter((i) => isLive(i.status, i.scheduledAt));
  const studyResourcesWithCounts = await Promise.all(liveResources.map(async (r: Record<string, unknown>) => ({
    slug: r.slug,
    titleEn: r.titleEn,
    titleBn: r.titleBn,
    icon: r.icon,
    route: r.route,
    bgColor: r.bgColor,
    fgColor: r.fgColor,
    materialTypes: r.materialTypes,
    displayOrder: r.displayOrder,
    count: await materialCount((r.materialTypes as string[]) ?? [])
  })));

  const sectionVisible = (key: string, fallback = true): boolean => {
    const cfg = sections.find((s) => s.key === key);
    return cfg ? cfg.visible : fallback;
  };

  const content: Record<string, unknown> = {};
  if (sectionVisible('quick_access') && quickAccess.length > 0) {
    content.quickAccess = quickAccess.map((i) => ({
      slug: i.slug, titleEn: i.titleEn, titleBn: i.titleBn, subtitleEn: i.subtitleEn, subtitleBn: i.subtitleBn,
      icon: i.icon, route: i.route, bgColor: i.bgColor, fgColor: i.fgColor, displayOrder: i.displayOrder
    }));
  }
  if (sectionVisible('resources') && studyResourcesWithCounts.length > 0) {
    content.studyResources = studyResourcesWithCounts;
  }
  if (sectionVisible('announcements') && notices.length > 0) {
    content.notices = notices;
  }
  if (sectionVisible('exams') && exams.length > 0) {
    content.upcomingExams = exams;
  }
  if (sectionVisible('community') && featured.length > 0) {
    content.featuredPosts = (featured as unknown as Array<Record<string, unknown>>).map((p) => ({
      _id: p._id,
      title: p.title,
      body: p.body,
      tags: p.tags,
      type: p.type,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      featuredAt: p.featuredAt,
      createdAt: p.createdAt,
      authorName: (p.authorId as { name?: string } | null)?.name ?? ''
    }));
  }
  content.welcome = settings
    ? settings.welcome
    : { messageEn: '', messageBn: '', visible: true };
  return content;
}
