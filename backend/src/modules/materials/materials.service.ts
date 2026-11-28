import { Types } from 'mongoose';
import { withVersionBump } from '../../core/with-version-bump';
import { conflict, forbidden, notFound } from '../../core/errors';
import { StudyMaterial, type IStudyMaterial } from '../../models/study-material.model';
import { Bookmark } from '../../models/bookmark.model';
import { ContentReport, type IContentReport } from '../../models/content-report.model';
import { MaterialView } from '../../models/material-view.model';
import { writeAudit } from '../../models/audit-log.model';

export type ListMaterialsOptions = {
  type?: string;
  programId?: string;
  regulationId?: string;
  technologyId?: string;
  semesterId?: string;
  subjectId?: string;
  chapterId?: string;
  examYear?: number;
  q?: string;
  sort: 'recent' | 'oldest' | 'popular' | 'title';
  page: number;
  limit: number;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildMaterialFilter(query: Partial<ListMaterialsOptions>): Record<string, unknown> {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (query.type) filter.type = query.type;
  if (query.examYear !== undefined) filter['payload.examYear'] = query.examYear;
  if (query.q) filter.$or = [
    { title: { $regex: escapeRegex(query.q), $options: 'i' } },
    { titleBn: { $regex: escapeRegex(query.q), $options: 'i' } },
    { description: { $regex: escapeRegex(query.q), $options: 'i' } }
  ];
  for (const key of ['programId', 'regulationId', 'technologyId', 'semesterId', 'subjectId', 'chapterId'] as const) {
    if (query[key]) filter[`hierarchyRefs.${key}`] = new Types.ObjectId(query[key]);
  }
  return filter;
}

const SORTS: Record<string, Record<string, 1 | -1>> = {
  recent: { createdAt: -1 },
  oldest: { createdAt: 1 },
  popular: { viewCount: -1 },
  title: { title: 1 }
};

export async function listMaterials(query: ListMaterialsOptions) {
  const filter = { ...buildMaterialFilter(query), status: 'published' };
  const typeOnlyFilter: Record<string, unknown> = { ...filter };
  delete typeOnlyFilter.type;
  const [items, total, countRows] = await Promise.all([
    StudyMaterial.find(filter).sort(SORTS[query.sort] ?? SORTS.recent)
      .skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    StudyMaterial.countDocuments(filter),
    StudyMaterial.aggregate<{ _id: string; count: number }>([
      { $match: typeOnlyFilter },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ])
  ]);
  const counts = Object.fromEntries(countRows.map((r) => [r._id, r.count]));
  return { items, meta: { page: query.page, limit: query.limit, total, counts } };
}

export async function getPublishedMaterial(id: string): Promise<IStudyMaterial> {
  if (!Types.ObjectId.isValid(id)) throw notFound('Material not found');
  const material = await StudyMaterial.findOne({ _id: new Types.ObjectId(id), status: 'published', deletedAt: null });
  if (!material) throw notFound('Material not found');
  return material;
}

export async function getMaterialAndView(id: string, userId?: string) {
  const material = await getPublishedMaterial(id);
  await StudyMaterial.updateOne({ _id: material._id }, { $inc: { viewCount: 1 } });
  if (userId) {
    await MaterialView.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), materialId: material._id },
      { $set: { viewedAt: new Date() } },
      { upsert: true }
    );
  }
  return material;
}

export async function listRecent(userId: string, limit: number) {
  const views = await MaterialView.find({ userId: new Types.ObjectId(userId) })
    .sort({ viewedAt: -1 }).limit(limit).lean();
  const materialIds = views.map((v) => v.materialId);
  const materials = await StudyMaterial.find({
    _id: { $in: materialIds }, status: 'published', deletedAt: null
  }).lean();
  const byId = new Map(materials.map((m) => [String(m._id), m]));
  const items = views.map((v) => byId.get(String(v.materialId))).filter(Boolean);
  return { items, viewedAtById: Object.fromEntries(views.map((v) => [String(v.materialId), v.viewedAt])) };
}

export async function addBookmark(userId: string, materialId: string) {
  const material = await getPublishedMaterial(materialId);
  await Bookmark.updateOne(
    { userId: new Types.ObjectId(userId), materialId: material._id },
    { $set: { deletedAt: null } },
    { upsert: true }
  );
  return { materialId: String(material._id), bookmarked: true };
}

export async function removeBookmark(userId: string, materialId: string) {
  if (!Types.ObjectId.isValid(materialId)) throw notFound('Material not found');
  const result = await Bookmark.updateOne(
    { userId: new Types.ObjectId(userId), materialId: new Types.ObjectId(materialId), deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
  if (result.matchedCount === 0) throw notFound('Bookmark not found');
  return { materialId, bookmarked: false };
}

export async function listBookmarks(userId: string, page: number, limit: number) {
  const filter = { userId: new Types.ObjectId(userId), deletedAt: null };
  const [bookmarks, total] = await Promise.all([
    Bookmark.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('materialId').lean(),
    Bookmark.countDocuments(filter)
  ]);
  const items = bookmarks
    .map((b) => b.materialId as unknown as IStudyMaterial & { deletedAt?: Date })
    .filter((m) => m && m.status === 'published' && !m.deletedAt);
  return { items, meta: { page, limit, total } };
}

export async function reportMaterial(
  userId: string,
  materialId: string,
  body: { reasonCode?: string; details?: string; reason?: string }
) {
  const material = await getPublishedMaterial(materialId);
  const existingOpen = await ContentReport.findOne({
    materialId: material._id,
    reporterId: new Types.ObjectId(userId),
    status: 'open',
    deletedAt: null
  }).lean();
  if (existingOpen) throw conflict('You already have an open report for this material');
  const reasonCode = (body.reasonCode ?? 'other') as IContentReport['reasonCode'];
  const reason = body.reason ?? body.details ?? reasonCode;
  const report = await ContentReport.create({
    materialId: material._id,
    reporterId: new Types.ObjectId(userId),
    reason,
    reasonCode,
    details: body.details
  });
  return report;
}

export async function getDownloadUrl(userId: string, materialId: string) {
  const material = await getPublishedMaterial(materialId);
  if (!material.downloadAllowed) throw forbidden('Download is not allowed for this material');
  const url = material.payload.fileUrl ?? material.payload.externalUrl;
  if (!url) throw notFound('No downloadable file for this material');
  return { url, materialId: String(material._id), userId };
}

export async function adminListMaterials(query: { type?: string; status?: string; q?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.q) filter.$or = [
    { title: { $regex: escapeRegex(query.q), $options: 'i' } },
    { titleBn: { $regex: escapeRegex(query.q), $options: 'i' } }
  ];
  const [items, total] = await Promise.all([
    StudyMaterial.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    StudyMaterial.countDocuments(filter)
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total } };
}

export async function adminCreateMaterial(body: Record<string, unknown>, actorId: string) {
  const material = await StudyMaterial.create({ ...(body as object), uploadedBy: new Types.ObjectId(actorId) });
  await writeAudit({ actorId, action: 'material.create', targetType: 'StudyMaterial', targetId: String(material._id), after: { title: material.title, type: material.type } });
  return material;
}

export async function adminGetMaterial(id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Material not found');
  const material = await StudyMaterial.findOne({ _id: new Types.ObjectId(id), deletedAt: null }).lean();
  if (!material) throw notFound('Material not found');
  return material;
}

export async function adminUpdateMaterial(id: string, body: Record<string, unknown>, actorId: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Material not found');
  const before = await StudyMaterial.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!before) throw notFound('Material not found');
  Object.assign(before, body);
  await before.save();
  await writeAudit({ actorId, action: 'material.update', targetType: 'StudyMaterial', targetId: id, before: { title: before.title, status: before.status }, after: body });
  return before;
}

export async function adminSetStatus(id: string, status: 'published' | 'unpublished' | 'draft', actorId: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Material not found');
  const material = await StudyMaterial.findOne({ _id: new Types.ObjectId(id), deletedAt: null });
  if (!material) throw notFound('Material not found');
  if (material.status === status) throw conflict(`Material is already "${status}"`);
  material.status = status;
  await material.save();
  await writeAudit({ actorId, action: `material.${status}`, targetType: 'StudyMaterial', targetId: id, after: { status } });
  return material;
}

export async function adminSoftDeleteMaterial(id: string, actorId: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Material not found');
  const result = await StudyMaterial.updateOne(
    { _id: new Types.ObjectId(id), deletedAt: null },
    withVersionBump({ $set: { deletedAt: new Date(), status: 'unpublished' } })
  );
  if (result.matchedCount === 0) throw notFound('Material not found');
  await writeAudit({ actorId, action: 'material.delete', targetType: 'StudyMaterial', targetId: id });
}

export async function adminListReports(query: { status: string; page: number; limit: number }) {
  const filter = { status: query.status, deletedAt: null };
  const [items, total] = await Promise.all([
    ContentReport.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit)
      .populate('materialId', 'title type status').lean(),
    ContentReport.countDocuments(filter)
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total } };
}

export async function adminResolveReport(reportId: string, status: 'resolved' | 'dismissed', note: string | undefined, actorId: string) {
  if (!Types.ObjectId.isValid(reportId)) throw notFound('Report not found');
  const report = await ContentReport.findOne({ _id: new Types.ObjectId(reportId), deletedAt: null });
  if (!report) throw notFound('Report not found');
  if (report.status !== 'open') throw conflict('Report is already closed');
  report.status = status;
  report.resolutionNote = note;
  report.resolvedBy = new Types.ObjectId(actorId);
  report.resolvedAt = new Date();
  await report.save();
  await writeAudit({ actorId, action: `content_report.${status}`, targetType: 'ContentReport', targetId: reportId, after: { status, note } });
  return report as IContentReport;
}
