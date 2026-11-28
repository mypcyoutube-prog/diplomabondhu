import request from 'supertest';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import { QuickAccessItem } from '../models/quick-access-item.model';
import { ImportHistory } from '../models/import-history.model';
import { ImportToken } from '../models/import-token.model';
import {
  previewImport, confirmImport, rollbackImport, runReaper, resolveRecovery, listRecovery, exportCategory
} from '../modules/home-import/home-import.service';
import { importPreviewSchema, bannerItemSchema } from '../modules/home-import/home-import.schemas';
import { REAPER_THRESHOLD_MS } from '../modules/home-import/home-import.service';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

async function adminToken(): Promise<string> {
  await User.create({
    name: 'Main Admin', email: 'admin@d.com',
    passwordHash: await bcrypt.hash('AdminPass123', 4), role: 'admin'
  });
  const res = await request(app).post('/api/v1/auth/login')
    .send({ email: 'admin@d.com', password: 'AdminPass123' });
  return res.body.data.accessToken;
}

async function moderatorToken(): Promise<string> {
  await User.create({
    name: 'Mod User', email: 'mod@d.com',
    passwordHash: await bcrypt.hash('ModPass123', 4), role: 'moderator'
  });
  const res = await request(app).post('/api/v1/auth/login')
    .send({ email: 'mod@d.com', password: 'ModPass123' });
  return res.body.data.accessToken;
}

async function adminId(): Promise<string> {
  let u = await User.findOne({ email: 'admin@d.com' });
  if (!u) {
    u = await User.create({
      name: 'Main Admin', email: 'admin@d.com',
      passwordHash: await bcrypt.hash('AdminPass123', 4), role: 'admin'
    });
  }
  return String(u!._id);
}

const ITEM = { slug: 'qa-imp', titleEn: 'Imported', titleBn: 'ইমপোর্টেড', icon: 'menu_book_rounded', route: '/library', status: 'published' as const };

describe('import preview', () => {
  it('is read-only, classifies create/update/skip and persists normalizedPayload in a durable token', async () => {
    await previewImport(testEnv, 'quick_access', [ITEM, { ...ITEM, slug: 'qa-imp-2', titleEn: 'Second' }], await adminId());
    expect(await QuickAccessItem.countDocuments()).toBe(0);
    const token = await ImportToken.findOne();
    expect(token!.status).toBe('issued');
    expect((token!.normalizedPayload as unknown[]).length).toBe(2);
  });

  it('classifies identical content as skip and reports invalid items per raw index', async () => {
    await QuickAccessItem.create({ ...ITEM });
    const actor = await adminId();
    const { preview } = await previewImport(testEnv, 'quick_access', [
      { ...ITEM },
      { slug: 'x', titleEn: 'Bad', titleBn: 'ব্যাড', icon: 'not_a_real_icon', route: '/library' }
    ], actor);
    expect(preview.summary.creates).toBe(0);
    expect(preview.summary.skips).toBe(1);
    expect(preview.summary.invalid).toBe(1);
    const invalid = preview.items.find((i: { action: string }) => i.action === 'invalid');
    expect(invalid!.index).toBe(1);
  });

  it('rejects more than 500 items and binary media references', async () => {
    const many = Array.from({ length: 501 }, (_, i) => ({ ...ITEM, slug: `s-${i}` }));
    expect(importPreviewSchema.safeParse({ category: 'quick_access', items: many }).success).toBe(false);
    expect(bannerItemSchema.safeParse({ title: 'T', imageUrl: 'data:image/png;base64,AAAA' }).success).toBe(false);
    expect(bannerItemSchema.safeParse({ title: 'T', imageUrl: 'https://cdn.d.com/b.png' }).success).toBe(true);
  });

  it('marks protected BTEB announcements as conflict in preview', async () => {
    const { Announcement } = await import('../models/announcement.model');
    await Announcement.create({ title: 'BTEB notice', body: 'Body text', source: 'bteb', status: 'published' });
    const actor = await adminId();
    const { preview } = await previewImport(testEnv, 'admin_notices', [
      { title: 'BTEB notice', body: 'Body text' }
    ], actor);
    expect(preview.summary.conflicts).toBe(1);
  });
});

describe('import confirm', () => {
  it('imports on confirm, is idempotent on retry and prevents duplicate batches', async () => {
    const actor = await adminId();
    const { token } = await previewImport(testEnv, 'quick_access', [ITEM, { ...ITEM, slug: 'qa-imp-2', titleEn: 'Second' }], actor);

    const first = await confirmImport(testEnv, token, actor);
    expect(first.status).toBe('completed');
    expect(first.report!.created).toBe(2);
    expect(await QuickAccessItem.countDocuments({ deletedAt: null })).toBe(2);

    const retry = await confirmImport(testEnv, token, actor);
    expect(retry.status).toBe('completed');
    expect(retry.batchId).toBe(first.batchId);
    expect(retry.report).toEqual(first.report);
    expect(await QuickAccessItem.countDocuments()).toBe(2);
    expect(await ImportHistory.countDocuments()).toBe(1);
  });

  it('handles concurrent confirms: exactly one batch is created', async () => {
    const actor = await adminId();
    const { token } = await previewImport(testEnv, 'quick_access', [ITEM], actor);
    const results = await Promise.allSettled([
      confirmImport(testEnv, token, actor),
      confirmImport(testEnv, token, actor)
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof confirmImport>>>[];
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    const batchIds = new Set(fulfilled.filter((r) => !r.value.inProgress).map((r) => String(r.value.batchId)));
    expect(batchIds.size).toBe(1);
    expect(await QuickAccessItem.countDocuments()).toBe(1);
    expect(await ImportHistory.countDocuments()).toBe(1);
  });

  it('returns 409 data_changed when state changed between preview and confirm', async () => {
    const actor = await adminId();
    const { token, summaryHash } = await previewImport(testEnv, 'quick_access', [ITEM], actor);
    await QuickAccessItem.create({ ...ITEM, titleEn: 'Changed after preview' });
    await expect(confirmImport(testEnv, token, actor)).rejects.toMatchObject({ code: 'CONFLICT', message: 'data_changed' });
    const t = await ImportToken.findOne({ summaryHash });
    expect(t!.status).toBe('failed');
    expect(await QuickAccessItem.countDocuments({ titleEn: 'Imported' })).toBe(0);
  });

  it('is user-bound: another admin cannot confirm someone else\'s token', async () => {
    const actor = await adminId();
    const other = await User.create({ name: 'Other Admin', email: 'admin2@d.com', passwordHash: 'x', role: 'admin' });
    const { token } = await previewImport(testEnv, 'quick_access', [ITEM], actor);
    await expect(confirmImport(testEnv, token, String(other._id))).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(await QuickAccessItem.countDocuments()).toBe(0);
  });

  it('rejects an expired token', async () => {
    const actor = await adminId();
    const { token } = await previewImport(testEnv, 'quick_access', [ITEM], actor);
    await ImportToken.updateOne({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(confirmImport(testEnv, token, actor)).rejects.toMatchObject({ code: 'GONE' });
  });

  it('enforces RBAC on the HTTP import endpoints', async () => {
    const mt = await moderatorToken();
    const st = (await request(app).post('/api/v1/auth/register')
      .send({ name: 'Stu', email: 'imp-stu@d.com', password: 'Password123' })).body.data.accessToken as string;
    const m = await request(app).post('/api/v1/admin/home/import/preview')
      .set('Authorization', `Bearer ${mt}`).send({ category: 'quick_access', items: [ITEM] });
    expect(m.status).toBe(403);
    const s = await request(app).post('/api/v1/admin/home/import/preview')
      .set('Authorization', `Bearer ${st}`).send({ category: 'quick_access', items: [ITEM] });
    expect(s.status).toBe(403);
  });

  it('end-to-end over HTTP: preview → confirm → history → export strips system fields', async () => {
    const at = await adminToken();
    const prev = await request(app).post('/api/v1/admin/home/import/preview')
      .set('Authorization', `Bearer ${at}`).send({ category: 'quick_access', items: [ITEM] });
    expect(prev.status).toBe(200);
    const token = prev.body.data.token as string;
    expect(prev.body.data.preview.summary.creates).toBe(1);

    const conf = await request(app).post('/api/v1/admin/home/import/confirm')
      .set('Authorization', `Bearer ${at}`).send({ token });
    expect(conf.status).toBe(200);
    expect(conf.body.data.report.created).toBe(1);

    const history = await request(app).get('/api/v1/admin/home/import/history')
      .set('Authorization', `Bearer ${at}`);
    expect(history.status).toBe(200);
    expect(history.body.data.items).toHaveLength(1);
    const batchId = history.body.data.items[0].batchId as string;

    const detail = await request(app).get(`/api/v1/admin/home/import/history/${batchId}`)
      .set('Authorization', `Bearer ${at}`);
    expect(detail.status).toBe(200);

    const exp = await request(app).get('/api/v1/admin/home/import/export?category=quick_access')
      .set('Authorization', `Bearer ${at}`);
    expect(exp.status).toBe(200);
    expect(exp.body.data.count).toBe(1);
    const item = exp.body.data.items[0] as Record<string, unknown>;
    for (const forbidden of ['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'createdByBatch', 'deletedAt']) {
      expect(item[forbidden]).toBeUndefined();
    }
  });
});

describe('rollback and recovery', () => {
  it('rolls back created docs via the three-condition rule and reports kept_modified for modified ones', async () => {
    const actor = await adminId();
    const { token } = await previewImport(testEnv, 'quick_access', [
      ITEM,
      { ...ITEM, slug: 'qa-mod', titleEn: 'Will Be Modified' }
    ], actor);
    const { batchId } = await confirmImport(testEnv, token, actor);
    expect(await QuickAccessItem.countDocuments()).toBe(2);

    await QuickAccessItem.updateOne({ slug: 'qa-mod' }, { $set: { titleEn: 'Edited by other admin' }, $inc: { __v: 1 } });

    const report = await rollbackImport(String(batchId), actor);
    expect(report.restored).toBe(1);
    expect(report.kept_modified).toHaveLength(1);
    expect(report.kept_modified[0].slug).toBe('qa-mod');

    expect(await QuickAccessItem.countDocuments({ slug: 'qa-imp', deletedAt: null })).toBe(0);
    const kept = await QuickAccessItem.findOne({ slug: 'qa-mod', deletedAt: null });
    expect(kept).not.toBeNull();
    expect(kept!.titleEn).toBe('Edited by other admin');
  });

  it('reaper recovers a crashed processing token with no snapshot as rolled_back', async () => {
    const actor = await adminId();
    const { token } = await previewImport(testEnv, 'quick_access', [ITEM], actor);
    const rec = await ImportToken.findOne({ summaryHash: { $exists: true } });
    await ImportToken.updateOne(
      { _id: rec!._id },
      {
        $set: {
          status: 'processing',
          batchId: new Types.ObjectId(),
          startedAt: new Date(Date.now() - REAPER_THRESHOLD_MS - 60_000),
          leaseUntil: null
        }
      }
    );
    void token;
    const results = await runReaper(new Date());
    expect(results).toHaveLength(1);
    expect(results[0].result).toEqual({ restored: 0, kept_modified: [], conflicts: [], status: 'rolled_back' });
    const after = await ImportToken.findById(rec!._id);
    expect(after!.status).toBe('rolled_back');
    expect(await QuickAccessItem.countDocuments()).toBe(0);
  });

  it('reaper does not touch a token with an active lease', async () => {
    const actor = await adminId();
    await previewImport(testEnv, 'quick_access', [ITEM], actor);
    const rec = await ImportToken.findOne();
    const activeLease = new Date(Date.now() + 5 * 60 * 1000);
    await ImportToken.updateOne(
      { _id: rec!._id },
      {
        $set: {
          status: 'processing',
          batchId: new Types.ObjectId(),
          startedAt: new Date(Date.now() - REAPER_THRESHOLD_MS - 60_000),
          leaseUntil: activeLease,
          leaseBy: 'request'
        }
      }
    );
    const results = await runReaper(new Date());
    expect(results).toHaveLength(0);
    const after = await ImportToken.findById(rec!._id);
    expect(after!.status).toBe('processing');
    expect(after!.leaseUntil!.getTime()).toBe(activeLease.getTime());
  });

  it('recovery resolve recovers an expired-lease processing token and lists it', async () => {
    const actor = await adminId();
    await previewImport(testEnv, 'quick_access', [ITEM], actor);
    const rec = await ImportToken.findOne();
    const batchId = new Types.ObjectId();
    await ImportToken.updateOne(
      { _id: rec!._id },
      {
        $set: {
          status: 'processing',
          batchId,
          startedAt: new Date(Date.now() - REAPER_THRESHOLD_MS - 60_000),
          leaseUntil: new Date(Date.now() - 1000)
        }
      }
    );
    const listed = await listRecovery();
    expect(listed.stuckProcessing).toHaveLength(1);
    const report = await resolveRecovery(String(batchId), actor);
    expect(report.status).toBe('rolled_back');
    const after = await ImportToken.findById(rec!._id);
    expect(after!.status).toBe('rolled_back');
  });

  it('recovery_required persists and is never auto-deleted; manual resolve recovers it', async () => {
    const actor = await adminId();
    await previewImport(testEnv, 'quick_access', [ITEM], actor);
    const rec = await ImportToken.findOne();
    const batchId = new Types.ObjectId();
    await ImportToken.updateOne(
      { _id: rec!._id },
      {
        $set: {
          status: 'recovery_required',
          batchId,
          startedAt: new Date(Date.now() - REAPER_THRESHOLD_MS - 60_000),
          lastError: 'simulated reaper failure'
        }
      }
    );
    await ImportHistory.create({ batchId, tokenJti: rec!.jti, category: 'quick_access', status: 'recovery_required', createdByUserId: rec!.userId, report: { created: 0, updated: 0, skipped: 0, failed: 0, restored: 0 } });

    const listed = await listRecovery();
    expect(listed.recoveryRequired).toHaveLength(1);

    const report = await resolveRecovery(String(batchId), actor);
    expect(['rolled_back', 'partially_completed']).toContain(report.status);
    const resolved = await ImportToken.findById(rec!._id);
    expect(resolved!.status).toBe(report.status);
  });
});
