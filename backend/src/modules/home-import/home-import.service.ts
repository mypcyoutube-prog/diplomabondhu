import jwt from 'jsonwebtoken';
import mongoose, { Types } from 'mongoose';
import { AppError, conflict, gone, notFound, validationError } from '../../core/errors';
import { computeSummaryHash, canonicalize, type VersionStateEntry } from '../../core/summary-hash';
import { isIconAllowed, isRouteAllowed } from '../../core/whitelists';
import { writeAudit } from '../../models/audit-log.model';
import { Announcement } from '../../models/announcement.model';
import { Banner } from '../../models/banner.model';
import { Exam } from '../../models/exam.model';
import { HomeConfiguration } from '../../models/home-configuration.model';
import { ImportHistory, type IImportHistory } from '../../models/import-history.model';
import { ImportSnapshot, type ISnapshotEntry } from '../../models/import-snapshot.model';
import { ImportToken, type IImportToken, type ImportCategory, type ImportStatus } from '../../models/import-token.model';
import { QuickAccessItem } from '../../models/quick-access-item.model';
import { StudyResourceCategory } from '../../models/study-resource-category.model';
import { withVersionBump } from '../../core/with-version-bump';
import {
  adminNoticeItemSchema, bannerItemSchema, homeConfigItemSchema,
  quickAccessItemSchema, studyResourceItemSchema, upcomingExamItemSchema
} from './home-import.schemas';

type Rec = Record<string, unknown>;
type Env = { JWT_ACCESS_SECRET: string };

type ZodLike = { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: { path: (string | number)[]; message: string }[] } } };

const BATCH_LIMIT = 500;
const SNAPSHOT_LIMIT_BYTES = 2 * 1024 * 1024;
const TOKEN_TTL_MS = 15 * 60 * 1000;
const SNAPSHOT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const REAPER_THRESHOLD_MS = 5 * 60 * 1000;
export const LEASE_MS = 10 * 60 * 1000;

const CONTENT_FIELDS: Record<ImportCategory, string[]> = {
  banners: ['title', 'imageUrl', 'linkUrl', 'ctaLabel', 'priority', 'status', 'startsAt', 'endsAt'],
  quick_access: ['slug', 'titleEn', 'titleBn', 'subtitleEn', 'subtitleBn', 'icon', 'route', 'bgColor', 'fgColor', 'displayOrder', 'status', 'scheduledAt', 'visibility'],
  study_resources: ['slug', 'titleEn', 'titleBn', 'icon', 'route', 'bgColor', 'fgColor', 'materialTypes', 'displayOrder', 'status', 'scheduledAt', 'visibility'],
  upcoming_exams: ['title', 'description', 'type', 'hierarchyRefs', 'durationSec', 'marksPerQuestion', 'negativeMarkPercent', 'status', 'scheduledAt', 'shuffle'],
  admin_notices: ['title', 'body', 'category', 'status', 'pdfUrl', 'scheduledAt'],
  home_config: ['key', 'visible', 'displayOrder', 'maxItems']
};

/** Fields that identify duplicates for a category. */
const DUP_FIELDS: Record<ImportCategory, string[]> = {
  banners: ['title'],
  quick_access: ['slug', 'titleEn'],
  study_resources: ['slug', 'titleEn'],
  upcoming_exams: ['title'],
  admin_notices: ['title'],
  home_config: ['key']
};

const COUNTER_FIELDS = ['likeCount', 'commentCount', 'viewCount', 'checkCount', 'recipientCount'];
const SENSITIVE_FIELDS = ['passwordHash', 'fcmTokens', 'integrations', 'googleDriveApiKey', 'tokenHash', 'likes', 'reports'];

const ITEM_SCHEMAS: Record<ImportCategory, ZodLike> = {
  banners: bannerItemSchema as unknown as ZodLike,
  quick_access: quickAccessItemSchema as unknown as ZodLike,
  study_resources: studyResourceItemSchema as unknown as ZodLike,
  upcoming_exams: upcomingExamItemSchema as unknown as ZodLike,
  admin_notices: adminNoticeItemSchema as unknown as ZodLike,
  home_config: homeConfigItemSchema as unknown as ZodLike
};

function modelFor(category: ImportCategory): mongoose.Model<any> {
  switch (category) {
    case 'banners': return Banner as unknown as mongoose.Model<any>;
    case 'quick_access': return QuickAccessItem as unknown as mongoose.Model<any>;
    case 'study_resources': return StudyResourceCategory as unknown as mongoose.Model<any>;
    case 'upcoming_exams': return Exam as unknown as mongoose.Model<any>;
    case 'admin_notices': return Announcement as unknown as mongoose.Model<any>;
    case 'home_config': return HomeConfiguration as unknown as mongoose.Model<any>;
  }
}

function identityField(category: ImportCategory): string {
  return category === 'quick_access' || category === 'study_resources' || category === 'home_config' ? 'slug' : 'title';
}

function pickFields(src: Rec, fields: string[]): Rec {
  const out: Rec = {};
  for (const f of fields) if (f in src && src[f] !== undefined) out[f] = src[f];
  return out;
}

function stripSnapshotFields(doc: Rec): Rec {
  const out: Rec = {};
  for (const [k, v] of Object.entries(doc)) {
    if (['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'createdByBatch', 'featuredBy', 'deletedAt', 'archived'].includes(k)) continue;
    if (COUNTER_FIELDS.includes(k) || SENSITIVE_FIELDS.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

function sameContent(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

function assertWhitelists(category: ImportCategory, item: Rec) {
  if (category === 'quick_access' || category === 'study_resources') {
    if (!isIconAllowed(String(item.icon ?? ''))) {
      throw validationError(`Unknown icon "${String(item.icon)}"; not in the verified Flutter icon whitelist`);
    }
    if (!isRouteAllowed(String(item.route ?? ''))) {
      throw validationError(`Unknown route "${String(item.route)}"; not in the GoRouter route whitelist`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* State collection for summaryHash                                    */
/* ------------------------------------------------------------------ */

async function collectState(category: ImportCategory, normalizedPayload: Rec[]) {
  const Model = modelFor(category);
  const duplicateState: Record<string, string[]> = {};
  for (const field of DUP_FIELDS[category]) {
    const values = await Model.distinct(field, { deletedAt: null });
    duplicateState[field] = (values as unknown[]).filter((v): v is string => typeof v === 'string').map((v) => v.trim());
  }
  const idField = identityField(category);
  const identities = new Set<string>();
  for (const item of normalizedPayload) {
    const id = item[idField];
    if (typeof id === 'string') identities.add(id.trim());
  }
  const matchedDocs = identities.size > 0
    ? await Model.find({ [idField]: { $in: [...identities] }, deletedAt: null }).select('_id __v updatedAt').lean<Rec[]>()
    : [];
  const versionState: VersionStateEntry[] = matchedDocs.map((d) => ({
    _id: String(d._id),
    __v: Number(d.__v ?? 0),
    updatedAt: new Date(d.updatedAt as Date).toISOString()
  }));
  return { duplicateState, versionState };
}

async function computeHashFor(category: ImportCategory, normalizedPayload: Rec[]): Promise<string> {
  const { duplicateState, versionState } = await collectState(category, normalizedPayload);
  return computeSummaryHash(category, normalizedPayload, duplicateState, versionState);
}

/* ------------------------------------------------------------------ */
/* Preview (strictly read-only)                                        */
/* ------------------------------------------------------------------ */

export interface PreviewItemResult {
  index: number;
  action: 'create' | 'update' | 'skip' | 'invalid' | 'conflict';
  reason?: string;
}

export async function previewImport(env: Env, category: ImportCategory, items: Rec[], actorId: string) {
  const Model = modelFor(category);
  const identity = identityField(category);

  if (items.length > BATCH_LIMIT) throw validationError(`Maximum ${BATCH_LIMIT} documents per batch`);
  if (items.length === 0) throw validationError('At least one document is required');

  const itemResults: PreviewItemResult[] = [];
  const validItems: { index: number; item: Rec }[] = [];
  for (let i = 0; i < items.length; i++) {
    const parsed = ITEM_SCHEMAS[category].safeParse(items[i]);
    if (!parsed.success) {
      const detail = (parsed.error?.issues ?? []).map((x) => `${x.path.join('.')}: ${x.message}`).join('; ');
      itemResults.push({ index: i, action: 'invalid', reason: detail || 'validation failed' });
      continue;
    }
    const item = pickFields(parsed.data as Rec, CONTENT_FIELDS[category]);
    if (category === 'admin_notices') item.source = 'admin';
    try {
      assertWhitelists(category, item);
    } catch (err) {
      itemResults.push({ index: i, action: 'invalid', reason: err instanceof AppError ? err.message : 'Invalid item' });
      continue;
    }
    validItems.push({ index: i, item });
  }

  for (const { index, item } of validItems) {
    const idValue = String(item[identity]).trim();
    const active = await Model.findOne({ [identity]: idValue, deletedAt: null }).lean<Rec | null>();
    let action: PreviewItemResult['action'] = 'create';
    let reason: string | undefined;
    if (active) {
      const beforeContent = pickFields(stripSnapshotFields(active), CONTENT_FIELDS[category]);
      if (category === 'admin_notices' && active.source === 'bteb') {
        action = 'conflict';
        reason = 'protected_bteb';
      } else if (sameContent(pickFields(beforeContent, Object.keys(item)), pickFields(item, Object.keys(item)))) {
        action = 'skip';
        reason = 'identical';
      } else {
        action = 'update';
      }
    } else {
      const trashed = await Model.findOne({ [identity]: idValue, deletedAt: { $ne: null } }).select('_id').lean();
      if (trashed) {
        action = 'conflict';
        reason = 'identity_exists_in_trash';
      }
    }
    item.action = action;
    if (reason) item.reason = reason;
    itemResults.push({ index, action, reason });
  }

  const normalizedPayload: Rec[] = validItems.map(({ item }) => ({
    ...pickFields(item, CONTENT_FIELDS[category]),
    action: item.action
  }));
  const summaryHash = await computeHashFor(category, normalizedPayload);

  const jti = new Types.ObjectId().toString();
  await ImportToken.create({
    jti,
    userId: new Types.ObjectId(actorId),
    category,
    summaryHash,
    normalizedPayload,
    status: 'issued',
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS)
  });
  const token = jwt.sign(
    { jti, category, hash: summaryHash },
    env.JWT_ACCESS_SECRET,
    { subject: actorId, expiresIn: '15m' }
  );

  await writeAudit({
    actorId, action: 'home.import.preview', targetType: 'ImportToken', targetId: jti,
    after: { category, items: items.length }
  });

  const summary = {
    total: items.length,
    valid: validItems.length,
    invalid: itemResults.filter((r) => r.action === 'invalid').length,
    creates: normalizedPayload.filter((i) => i.action === 'create').length,
    updates: normalizedPayload.filter((i) => i.action === 'update').length,
    skips: normalizedPayload.filter((i) => i.action === 'skip').length,
    conflicts: normalizedPayload.filter((i) => i.action === 'conflict').length
  };
  return { preview: { category, summary, items: itemResults }, summaryHash, token };
}

/* ------------------------------------------------------------------ */
/* Confirm (atomic claim → history → revalidate → snapshot → writes)   */
/* ------------------------------------------------------------------ */

export interface ConfirmOutcome {
  status: 'completed' | 'partially_completed' | 'failed';
  batchId?: string;
  report?: IImportHistory['report'];
  inProgress?: boolean;
}

function emptyReport(reason: string): IImportHistory['report'] {
  return { created: 0, updated: 0, skipped: 0, failed: 0, restored: 0, kept_modified: [], conflicts: [{ slug: '-', reason }] };
}

async function getOrCreateHistory(token: IImportToken, batchId: Types.ObjectId): Promise<IImportHistory> {
  return ImportHistory.findOneAndUpdate(
    { batchId },
    {
      $setOnInsert: {
        batchId,
        tokenJti: token.jti,
        category: token.category,
        status: 'processing',
        createdByUserId: token.userId,
        report: { created: 0, updated: 0, skipped: 0, failed: 0, restored: 0 }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function deriveFinalStatus(ops: ISnapshotEntry[], report: IImportHistory['report']): 'completed' | 'partially_completed' | 'failed' {
  if (report.failed === 0) return 'completed';
  if (report.created + report.updated > 0 || ops.every((o) => o.op === 'skip')) return 'partially_completed';
  return 'failed';
}

async function buildSnapshot(category: ImportCategory, normalizedPayload: Rec[]) {
  const Model = modelFor(category);
  const identity = identityField(category);
  const entries: ISnapshotEntry[] = [];
  const ops: ISnapshotEntry[] = [];

  for (const item of normalizedPayload) {
    const idValue = String(item[identity]).trim();
    const action = String(item.action);
    const content = pickFields(item, CONTENT_FIELDS[category]);
    const active = await Model.findOne({ [identity]: idValue, deletedAt: null }).lean<Rec | null>();
    if (action === 'skip') {
      const entry: ISnapshotEntry = { slug: idValue, op: 'skip', before: null, after: null, docId: active ? new Types.ObjectId(String(active._id)) : null, expectedVersion: null, expectedUpdatedAt: null };
      entries.push(entry);
      continue;
    }
    if (action === 'create') {
      const entry: ISnapshotEntry = { slug: idValue, op: 'create', before: null, after: content, docId: null, expectedVersion: 0, expectedUpdatedAt: null };
      entries.push(entry);
      ops.push(entry);
      continue;
    }
    if (action === 'conflict') {
      const entry: ISnapshotEntry = { slug: idValue, op: 'skip', before: null, after: null, docId: null, expectedVersion: null, expectedUpdatedAt: null };
      entries.push(entry);
      continue;
    }
    const entry: ISnapshotEntry = {
      slug: idValue,
      op: 'update',
      before: active ? pickFields(stripSnapshotFields(active), CONTENT_FIELDS[category]) : null,
      after: content,
      docId: active ? new Types.ObjectId(String(active._id)) : null,
      expectedVersion: active ? Number(active.__v ?? 0) : null,
      expectedUpdatedAt: active ? new Date(active.updatedAt as Date) : null
    };
    entries.push(entry);
    ops.push(entry);
  }
  return { entries, ops };
}

async function applyWrites(category: ImportCategory, ops: ISnapshotEntry[], batchId: Types.ObjectId, actorId: string): Promise<IImportHistory['report']> {
  const Model = modelFor(category);
  const report: IImportHistory['report'] = { created: 0, updated: 0, skipped: 0, failed: 0, restored: 0, kept_modified: [], conflicts: [] };

  for (const op of ops) {
    try {
      if (op.op === 'create') {
        await Model.create({
          ...op.after,
          createdBy: new Types.ObjectId(actorId),
          updatedBy: new Types.ObjectId(actorId),
          createdByBatch: batchId
        });
        report.created++;
      } else if (op.op === 'update') {
        const result = await Model.updateOne(
          { _id: op.docId, deletedAt: null, __v: op.expectedVersion ?? 0, updatedAt: op.expectedUpdatedAt },
          withVersionBump({ $set: { ...op.after, updatedBy: new Types.ObjectId(actorId) } })
        );
        if (result.matchedCount === 0) {
          report.failed++;
          report.conflicts?.push({ slug: op.slug, reason: 'version_conflict_or_deleted' });
        } else {
          report.updated++;
        }
      }
    } catch (err) {
      report.failed++;
      const reason = err instanceof Error ? err.message.slice(0, 200) : 'write failed';
      if ((err as { code?: number }).code === 11000) {
        report.conflicts?.push({ slug: op.slug, reason: 'duplicate_key' });
      } else {
        report.conflicts?.push({ slug: op.slug, reason });
      }
    }
  }
  return report;
}

async function finalizeImport(token: IImportToken, batchId: Types.ObjectId, finalStatus: 'completed' | 'partially_completed' | 'failed', report: IImportHistory['report']) {
  const now = new Date();
  await ImportToken.updateOne(
    { _id: token._id },
    { $set: { status: finalStatus, completedAt: now, leaseUntil: null, leaseBy: null, lastError: null } }
  );
  await ImportHistory.updateOne(
    { batchId },
    { $set: { status: finalStatus, report: { ...report, finishedAt: now }, finishedAt: now } }
  );
}

export async function confirmImport(env: Env, tokenJwt: string, actorId: string): Promise<ConfirmOutcome> {
  let claims: { jti: string; category: string; hash: string };
  try {
    claims = jwt.verify(tokenJwt, env.JWT_ACCESS_SECRET) as { jti: string; category: string; hash: string };
  } catch {
    throw validationError('Invalid or expired preview token');
  }
  const token = await ImportToken.findOne({ jti: claims.jti });
  if (!token) throw notFound('Preview token not found');
  if (String(token.userId) !== actorId) throw new AppError('FORBIDDEN', 'Preview token belongs to another user');
  if (token.expiresAt.getTime() < Date.now()) throw gone('Preview token expired');

  if (token.status === 'completed' || token.status === 'partially_completed') {
    const history = await ImportHistory.findOne({ batchId: token.batchId });
    return { status: token.status as ConfirmOutcome['status'], batchId: String(token.batchId), report: history?.report };
  }
  if (token.status === 'processing') {
    return { status: 'completed', batchId: String(token.batchId), inProgress: true };
  }
  if (token.status === 'failed' || token.status === 'rolled_back' || token.status === 'recovery_required') {
    throw conflict('Preview token already used or invalidated; create a new preview');
  }

  const batchId = new Types.ObjectId();
  const claimed = await ImportToken.findOneAndUpdate(
    { _id: token._id, status: 'issued' },
    {
      $set: {
        status: 'processing',
        batchId,
        startedAt: new Date(),
        leaseUntil: new Date(Date.now() + LEASE_MS),
        leaseBy: 'request'
      }
    },
    { new: true }
  );

  if (!claimed) {
    const current = await ImportToken.findById(token._id);
    if (current && (current.status === 'completed' || current.status === 'partially_completed')) {
      const history = await ImportHistory.findOne({ batchId: current.batchId });
      return { status: current.status as ConfirmOutcome['status'], batchId: String(current.batchId), report: history?.report };
    }
    if (current && current.status === 'processing') {
      return { status: 'completed', batchId: String(current.batchId), inProgress: true };
    }
    throw conflict('Preview token is no longer confirmable');
  }

  await getOrCreateHistory(claimed, batchId);

  try {
    const recomputed = await computeHashFor(token.category as ImportCategory, token.normalizedPayload as Rec[]);
    if (recomputed !== token.summaryHash) {
      await ImportToken.updateOne({ _id: claimed._id }, { $set: { status: 'failed', completedAt: new Date(), lastError: 'data_changed', leaseUntil: null, leaseBy: null } });
      await ImportHistory.updateOne({ batchId }, { $set: { status: 'failed', report: emptyReport('data_changed'), finishedAt: new Date() } });
      throw conflict('data_changed');
    }

    const { entries, ops } = await buildSnapshot(token.category as ImportCategory, token.normalizedPayload as Rec[]);
    const sizeBytes = Buffer.byteLength(JSON.stringify(entries));
    if (sizeBytes > SNAPSHOT_LIMIT_BYTES) {
      await ImportToken.updateOne({ _id: claimed._id }, { $set: { status: 'failed', completedAt: new Date(), lastError: 'snapshot_too_large', leaseUntil: null, leaseBy: null } });
      await ImportHistory.updateOne({ batchId }, { $set: { status: 'failed', report: emptyReport('snapshot_too_large'), finishedAt: new Date() } });
      throw validationError('Snapshot exceeds 2 MB limit; reduce batch size');
    }
    const snapshot = await ImportSnapshot.create({
      batchId, category: token.category, docs: entries, sizeBytes, docCount: entries.length,
      expiresAt: new Date(Date.now() + SNAPSHOT_RETENTION_MS)
    });
    await ImportHistory.updateOne({ batchId }, { $set: { snapshotId: snapshot._id } });

    const report = await applyWrites(token.category as ImportCategory, ops, batchId, actorId);
    const finalStatus = deriveFinalStatus(ops, report);
    await finalizeImport(claimed, batchId, finalStatus, report);
    await writeAudit({ actorId, action: 'home.import.confirm', targetType: 'ImportHistory', targetId: String(batchId), after: { category: token.category, status: finalStatus, ...report } });
    const stored = await ImportHistory.findOne({ batchId });
    return { status: finalStatus, batchId: String(batchId), report: stored?.report };
  } catch (err) {
    if (err instanceof AppError) throw err;
    await ImportToken.updateOne(
      { _id: claimed._id, status: 'processing' },
      { $set: { lastError: err instanceof Error ? err.message : String(err) } }
    );
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export async function exportCategory(category: ImportCategory) {
  const Model = modelFor(category);
  const docs = await Model.find({ deletedAt: null }).sort({ createdAt: 1 }).lean<Rec[]>();
  const items = docs.map((d) => pickFields(stripSnapshotFields(d), CONTENT_FIELDS[category]));
  return { category, count: items.length, items };
}

/* ------------------------------------------------------------------ */
/* Delete-safe rollback                                                */
/* ------------------------------------------------------------------ */

export interface RecoveryReport {
  restored: number;
  kept_modified: { slug: string; reason: string }[];
  conflicts: { slug: string; reason: string }[];
  status: 'rolled_back' | 'partially_completed' | 'recovery_required';
}

export async function rollbackImport(batchId: string, actorId: string): Promise<RecoveryReport> {
  if (!Types.ObjectId.isValid(batchId)) throw notFound('Batch not found');
  const history = await ImportHistory.findOne({ batchId: new Types.ObjectId(batchId) });
  if (!history) throw notFound('Batch not found');
  const token = await ImportToken.findOne({ jti: history.tokenJti });
  if (token && token.status === 'rolled_back') {
    return {
      restored: history.report.restored ?? 0,
      kept_modified: history.report.kept_modified ?? [],
      conflicts: history.report.conflicts ?? [],
      status: 'rolled_back'
    };
  }
  if (token && token.status === 'recovery_required') {
    throw conflict('Batch requires manual recovery; use the recovery resolve endpoint');
  }

  const snapshot = await ImportSnapshot.findOne({ batchId: new Types.ObjectId(batchId) });
  if (!snapshot) throw conflict('No snapshot exists for this batch; safe rollback is not possible');

  const Model = modelFor(history.category as ImportCategory);
  const identity = identityField(history.category as ImportCategory);
  const now = new Date();
  const report: RecoveryReport = { restored: 0, kept_modified: [], conflicts: [], status: 'rolled_back' };

  for (const entry of snapshot.docs as ISnapshotEntry[]) {
    if (entry.op === 'skip') continue;
    if (entry.op === 'create') {
      const result = await Model.updateOne(
        {
          [identity]: entry.slug,
          createdByBatch: new Types.ObjectId(batchId),
          __v: 0,
          deletedAt: null,
          $expr: { $eq: ['$updatedAt', '$createdAt'] }
        },
        withVersionBump({ $set: { deletedAt: now } })
      );
      if (result.matchedCount > 0) report.restored++;
      else report.kept_modified.push({ slug: entry.slug, reason: 'modified_after_import_or_missing' });
      continue;
    }
    const result = await Model.updateOne(
      {
        _id: entry.docId,
        deletedAt: null,
        __v: entry.expectedVersion ?? 0,
        updatedAt: entry.expectedUpdatedAt
      },
      withVersionBump({ $set: { ...(entry.before ?? {}), updatedBy: new Types.ObjectId(actorId) } })
    );
    if (result.matchedCount > 0) report.restored++;
    else report.conflicts.push({ slug: entry.slug, reason: 'version_conflict_current_state_preserved' });
  }

  report.status = report.kept_modified.length + report.conflicts.length > 0 ? 'partially_completed' : 'rolled_back';
  await ImportHistory.updateOne(
    { batchId: new Types.ObjectId(batchId) },
    { $set: { status: report.status, report: { ...history.report, ...report, finishedAt: now }, finishedAt: now } }
  );
  if (token) {
    await ImportToken.updateOne(
      { _id: token._id },
      { $set: { status: report.status === 'rolled_back' ? 'rolled_back' : 'partially_completed', completedAt: now, leaseUntil: null, leaseBy: null } }
    );
  }
  await writeAudit({ actorId, action: 'home.import.rollback', targetType: 'ImportHistory', targetId: batchId, after: { ...report } });
  return report;
}

/* ------------------------------------------------------------------ */
/* Processing Reaper (lease-based, idempotent recovery)                */
/* ------------------------------------------------------------------ */

async function contentEqualsCurrent(Model: ReturnType<typeof modelFor>, docId: Types.ObjectId, content: Rec | null): Promise<boolean> {
  if (!docId || !content) return false;
  const doc = await Model.findById(docId).lean<Rec | null>();
  if (!doc) return false;
  return sameContent(pickFields(stripSnapshotFields(doc), Object.keys(content)), content);
}

async function recoverToken(token: IImportToken): Promise<RecoveryReport> {
  const batchId = token.batchId!;
  const history = await getOrCreateHistory(token, batchId);
  const snapshot = await ImportSnapshot.findOne({ batchId });

  if (!snapshot) {
    // Snapshot is created before the first write; no snapshot ⇒ zero writes.
    const now = new Date();
    await ImportToken.updateOne({ _id: token._id }, { $set: { status: 'rolled_back', completedAt: now, leaseUntil: null, leaseBy: null } });
    await ImportHistory.updateOne(
      { batchId },
      { $set: { status: 'rolled_back', report: { ...history.report, restored: 0, kept_modified: [], conflicts: [], finishedAt: now }, finishedAt: now } }
    );
    return { restored: 0, kept_modified: [], conflicts: [], status: 'rolled_back' };
  }

  const category = token.category as ImportCategory;
  const Model = modelFor(category);
  const identity = identityField(category);
  const report: RecoveryReport = { restored: 0, kept_modified: [], conflicts: [], status: 'rolled_back' };

  for (const entry of snapshot.docs as ISnapshotEntry[]) {
    if (entry.op === 'skip') continue;
    if (entry.op === 'create') {
      const doc = await Model.findOne({ [identity]: entry.slug, deletedAt: null }).lean<Rec | null>();
      if (!doc) {
        await Model.create({ ...entry.after, createdByBatch: batchId });
        report.restored++;
      } else if (String(doc.createdByBatch ?? '') === String(batchId)) {
        report.restored++;
      } else {
        report.kept_modified.push({ slug: entry.slug, reason: 'modified_by_other_admin' });
      }
      continue;
    }
    const current = entry.docId ? await Model.findById(entry.docId).lean<Rec | null>() : null;
    if (!current) {
      report.conflicts.push({ slug: entry.slug, reason: 'document_deleted_after_import' });
      continue;
    }
    if (await contentEqualsCurrent(Model, entry.docId!, entry.after)) {
      report.restored++;
      continue;
    }
    const result = await Model.updateOne(
      { _id: entry.docId, deletedAt: null, __v: entry.expectedVersion ?? 0, updatedAt: entry.expectedUpdatedAt },
      withVersionBump({ $set: { ...(entry.after ?? {}), updatedBy: null } })
    );
    if (result.matchedCount > 0) report.restored++;
    else report.kept_modified.push({ slug: entry.slug, reason: 'modified_after_import' });
  }

  const now = new Date();
  report.status = report.kept_modified.length + report.conflicts.length > 0 ? 'partially_completed' : 'rolled_back';
  const tokenStatus: ImportStatus = report.kept_modified.length + report.conflicts.length > 0 ? 'partially_completed' : 'rolled_back';
  await ImportToken.updateOne({ _id: token._id }, { $set: { status: tokenStatus, completedAt: now, leaseUntil: null, leaseBy: null } });
  await ImportHistory.updateOne(
    { batchId },
    { $set: { status: tokenStatus, report: { ...history.report, ...report, finishedAt: now }, finishedAt: now } }
  );
  return report;
}

async function markRecoveryRequired(token: IImportToken, message: string) {
  await ImportToken.updateOne(
    { _id: token._id, status: { $in: ['processing', 'recovery_required'] } },
    { $set: { status: 'recovery_required', lastError: message } }
  );
  if (token.batchId) {
    await ImportHistory.updateOne(
      { batchId: token.batchId },
      { $set: { status: 'recovery_required' } }
    );
  }
}

export async function runReaper(now = new Date()): Promise<{ jti: string; batchId: string; result: RecoveryReport | string }[]> {
  const threshold = new Date(now.getTime() - REAPER_THRESHOLD_MS);
  const stale = { $or: [{ leaseUntil: null }, { leaseUntil: { $lte: now } }] };
  const candidates = await ImportToken.find({ status: 'processing', startedAt: { $lte: threshold } }).limit(10);
  const results: { jti: string; batchId: string; result: RecoveryReport | string }[] = [];

  for (const candidate of candidates) {
    const claimed = await ImportToken.findOneAndUpdate(
      { _id: candidate._id, status: 'processing', startedAt: { $lte: threshold }, ...stale },
      { $set: { leaseUntil: new Date(now.getTime() + LEASE_MS), leaseBy: 'reaper' } },
      { new: true }
    );
    if (!claimed) continue;
    try {
      const result = await recoverToken(claimed);
      results.push({ jti: claimed.jti, batchId: String(claimed.batchId), result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markRecoveryRequired(claimed, message);
      results.push({ jti: claimed.jti, batchId: String(claimed.batchId), result: 'recovery_required' });
    }
  }
  return results;
}

export function startReaper(intervalMs = 2 * 60 * 1000): NodeJS.Timeout {
  const timer = setInterval(() => {
    runReaper().catch(() => undefined);
  }, intervalMs);
  timer.unref();
  return timer;
}

/* ------------------------------------------------------------------ */
/* Recovery listing + manual resolve                                   */
/* ------------------------------------------------------------------ */

export async function listRecovery() {
  const staleThreshold = new Date(Date.now() - REAPER_THRESHOLD_MS);
  const [stuck, required] = await Promise.all([
    ImportToken.find({ status: 'processing', startedAt: { $lte: staleThreshold } }).select('jti batchId category status startedAt leaseUntil lastError').lean(),
    ImportToken.find({ status: 'recovery_required' }).select('jti batchId category status startedAt lastError').lean()
  ]);
  return { stuckProcessing: stuck, recoveryRequired: required };
}

export async function resolveRecovery(batchId: string, actorId: string) {
  if (!Types.ObjectId.isValid(batchId)) throw notFound('Batch not found');
  const token = await ImportToken.findOne({ batchId: new Types.ObjectId(batchId) });
  if (!token) throw notFound('Batch not found');
  if (token.status !== 'recovery_required' && token.status !== 'processing') {
    throw conflict('Batch is not in a recoverable state');
  }
  if (token.status === 'processing') {
    const claimed = await ImportToken.findOneAndUpdate(
      { _id: token._id, status: 'processing', $or: [{ leaseUntil: null }, { leaseUntil: { $lte: new Date() } }] },
      { $set: { leaseUntil: new Date(Date.now() + LEASE_MS), leaseBy: `manual:${actorId}` } },
      { new: true }
    );
    if (!claimed) throw conflict('Another worker holds an active lease on this batch');
    try {
      const report = await recoverToken(claimed);
      await writeAudit({ actorId, action: 'home.import.recovery.resolve', targetType: 'ImportHistory', targetId: batchId, after: report });
      return report;
    } catch (err) {
      await markRecoveryRequired(claimed, err instanceof Error ? err.message : String(err));
      throw conflict('Recovery attempt failed; batch remains recovery_required');
    }
  }
  try {
    const report = await recoverToken(token);
    await writeAudit({ actorId, action: 'home.import.recovery.resolve', targetType: 'ImportHistory', targetId: batchId, after: report });
    return report;
  } catch (err) {
    await markRecoveryRequired(token, err instanceof Error ? err.message : String(err));
    throw conflict('Recovery attempt failed; batch remains recovery_required');
  }
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

export async function listHistory(page: number, limit: number) {
  const [items, total] = await Promise.all([
    ImportHistory.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ImportHistory.countDocuments()
  ]);
  return { items, meta: { page, limit, total } };
}

export async function getHistory(batchId: string) {
  if (!Types.ObjectId.isValid(batchId)) throw notFound('Batch not found');
  const history = await ImportHistory.findOne({ batchId: new Types.ObjectId(batchId) }).lean();
  if (!history) throw notFound('Batch not found');
  return history;
}
