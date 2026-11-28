import request from 'supertest';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import { AuditLog } from '../models/audit-log.model';
import { StudyMaterial } from '../models/study-material.model';
import { QuickAccessItem } from '../models/quick-access-item.model';

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

async function studentToken(email = 'stu@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Student One', email, password: 'Password123' });
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

const VALID_ITEM = { slug: 'qa-library', titleEn: 'Study', titleBn: 'স্টাডি', icon: 'menu_book_rounded', route: '/library' };

describe('home admin CRUD and public content', () => {
  it('creates, publishes and serves quick-access via public API; drafts and empties are hidden', async () => {
    const at = await adminToken();
    const st = await studentToken();

    const empty = await request(app).get('/api/v1/home/content').set('Authorization', `Bearer ${st}`);
    expect(empty.status).toBe(200);
    expect(empty.body.data.quickAccess).toBeUndefined();

    const created = await request(app).post('/api/v1/admin/home/quick-access')
      .set('Authorization', `Bearer ${at}`).send(VALID_ITEM);
    expect(created.status).toBe(201);
    const id = created.body.data.item._id as string;

    const publicDraft = await request(app).get('/api/v1/home/content').set('Authorization', `Bearer ${st}`);
    expect(publicDraft.body.data.quickAccess).toBeUndefined();

    const published = await request(app).post(`/api/v1/admin/home/quick-access/${id}/publish`)
      .set('Authorization', `Bearer ${at}`);
    expect(published.status).toBe(200);

    const pub = await request(app).get('/api/v1/home/content').set('Authorization', `Bearer ${st}`);
    expect(pub.status).toBe(200);
    const qa = pub.body.data.quickAccess as Array<{ slug: string; titleBn: string }>;
    expect(qa).toHaveLength(1);
    expect(qa[0].slug).toBe('qa-library');
    expect(qa[0].titleBn).toBe('স্টাডি');
  });

  it('rejects unknown icons and routes', async () => {
    const at = await adminToken();
    const badIcon = await request(app).post('/api/v1/admin/home/quick-access')
      .set('Authorization', `Bearer ${at}`).send({ ...VALID_ITEM, icon: 'Icons.some_made_up' });
    expect(badIcon.status).toBe(400);
    const badRoute = await request(app).post('/api/v1/admin/home/quick-access')
      .set('Authorization', `Bearer ${at}`).send({ ...VALID_ITEM, route: '/nonexistent' });
    expect(badRoute.status).toBe(400);
  });

  it('soft-deletes, hides from public, restores', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const created = await request(app).post('/api/v1/admin/home/quick-access')
      .set('Authorization', `Bearer ${at}`).send(VALID_ITEM);
    const id = created.body.data.item._id as string;
    await request(app).post(`/api/v1/admin/home/quick-access/${id}/publish`).set('Authorization', `Bearer ${at}`);

    const del = await request(app).delete(`/api/v1/admin/home/quick-access/${id}`).set('Authorization', `Bearer ${at}`);
    expect(del.status).toBe(200);
    const pub = await request(app).get('/api/v1/home/content').set('Authorization', `Bearer ${st}`);
    expect(pub.body.data.quickAccess).toBeUndefined();

    const restored = await request(app).post(`/api/v1/admin/home/quick-access/${id}/restore`).set('Authorization', `Bearer ${at}`);
    expect(restored.status).toBe(200);
    await request(app).post(`/api/v1/admin/home/quick-access/${id}/publish`).set('Authorization', `Bearer ${at}`);
    await request(app).post(`/api/v1/admin/home/quick-access/${id}/visibility`).set('Authorization', `Bearer ${at}`).send({ visible: true });
    const pub2 = await request(app).get('/api/v1/home/content').set('Authorization', `Bearer ${st}`);
    expect(pub2.body.data.quickAccess).toHaveLength(1);
  });

  it('computes real published material counts for study resources', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const res = await request(app).post('/api/v1/admin/home/study-resources')
      .set('Authorization', `Bearer ${at}`)
      .send({ slug: 'res-books', titleEn: 'Books', titleBn: 'বই', icon: 'auto_stories_rounded', route: '/library', materialTypes: ['book'] });
    expect(res.status).toBe(201);
    const id = res.body.data.item._id as string;
    await request(app).post(`/api/v1/admin/home/study-resources/${id}/publish`).set('Authorization', `Bearer ${at}`);

    await StudyMaterial.create([
      { type: 'book', title: 'Pub 1', status: 'published' },
      { type: 'book', title: 'Pub 2', status: 'published' },
      { type: 'book', title: 'Draft', status: 'draft' },
      { type: 'note', title: 'Other type', status: 'published' },
      { type: 'book', title: 'Deleted', status: 'published', deletedAt: new Date() }
    ]);

    const pub = await request(app).get('/api/v1/home/content').set('Authorization', `Bearer ${st}`);
    const resources = pub.body.data.studyResources as Array<{ slug: string; count: number }>;
    expect(resources).toHaveLength(1);
    expect(resources[0].count).toBe(2);
  });

  it('scheduled items appear only after their scheduled time', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const created = await request(app).post('/api/v1/admin/home/quick-access')
      .set('Authorization', `Bearer ${at}`).send(VALID_ITEM);
    const id = created.body.data.item._id as string;
    const future = await request(app).post(`/api/v1/admin/home/quick-access/${id}/schedule`)
      .set('Authorization', `Bearer ${at}`).send({ scheduledAt: new Date(Date.now() + 3_600_000).toISOString() });
    expect(future.status).toBe(200);

    const before = await request(app).get('/api/v1/home/content').set('Authorization', `Bearer ${st}`);
    expect(before.body.data.quickAccess).toBeUndefined();

    await QuickAccessItem.updateOne({ _id: id }, { $set: { scheduledAt: new Date(Date.now() - 1000) } });
    const after = await request(app).get('/api/v1/home/content').set('Authorization', `Bearer ${st}`);
    expect(after.body.data.quickAccess).toHaveLength(1);
  });

  it('home configuration can hide a section for everyone', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const created = await request(app).post('/api/v1/admin/home/quick-access')
      .set('Authorization', `Bearer ${at}`).send(VALID_ITEM);
    const id = created.body.data.item._id as string;
    await request(app).post(`/api/v1/admin/home/quick-access/${id}/publish`).set('Authorization', `Bearer ${at}`);

    const cfg = await request(app).post('/api/v1/admin/home/configuration')
      .set('Authorization', `Bearer ${at}`).send({ key: 'quick_access', visible: false });
    expect(cfg.status).toBe(200);

    const pub = await request(app).get('/api/v1/home/content').set('Authorization', `Bearer ${st}`);
    expect(pub.body.data.quickAccess).toBeUndefined();
  });

  it('welcome configuration is admin-controlled via SETTINGS_MANAGE', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const denied = await request(app).put('/api/v1/admin/home/welcome')
      .set('Authorization', `Bearer ${st}`).send({ messageEn: 'hack' });
    expect(denied.status).toBe(403);

    const put = await request(app).put('/api/v1/admin/home/welcome')
      .set('Authorization', `Bearer ${at}`).send({ messageEn: 'Welcome back!', messageBn: 'স্বাগতম!', visible: true });
    expect(put.status).toBe(200);

    const pub = await request(app).get('/api/v1/home/content').set('Authorization', `Bearer ${st}`);
    expect(pub.body.data.welcome.messageEn).toBe('Welcome back!');
    expect(pub.body.data.welcome.messageBn).toBe('স্বাগতম!');
  });

  it('enforces RBAC: student and moderator cannot access home admin endpoints', async () => {
    const st = await studentToken();
    const mt = await moderatorToken();
    const s = await request(app).get('/api/v1/admin/home/quick-access').set('Authorization', `Bearer ${st}`);
    expect(s.status).toBe(403);
    const s2 = await request(app).post('/api/v1/admin/home/quick-access')
      .set('Authorization', `Bearer ${st}`).send(VALID_ITEM);
    expect(s2.status).toBe(403);
    const m = await request(app).get('/api/v1/admin/home/quick-access').set('Authorization', `Bearer ${mt}`);
    expect(m.status).toBe(403);
    const m2 = await request(app).post('/api/v1/admin/home/import/preview')
      .set('Authorization', `Bearer ${mt}`).send({ category: 'quick_access', items: [VALID_ITEM] });
    expect(m2.status).toBe(403);
    const m3 = await request(app).get('/api/v1/admin/home/import/history').set('Authorization', `Bearer ${mt}`);
    expect(m3.status).toBe(403);
    const anon = await request(app).get('/api/v1/home/content');
    expect(anon.status).toBe(401);
  });
});

describe('BTEB announcement integrity', () => {
  const ADMIN_NOTIF = '/api/v1/notifications/admin';

  async function createBteb(at: string): Promise<string> {
    const res = await request(app).post(`${ADMIN_NOTIF}/announcements`)
      .set('Authorization', `Bearer ${at}`)
      .send({ title: 'BTEB routine published', body: 'The 5th semester routine is now available.', source: 'bteb' });
    expect(res.status).toBe(201);
    return res.body.data.item._id as string;
  }

  it('blocks edit and delete of BTEB notices with 403', async () => {
    const at = await adminToken();
    const id = await createBteb(at);

    const upd = await request(app).put(`${ADMIN_NOTIF}/announcements/${id}`)
      .set('Authorization', `Bearer ${at}`).send({ title: 'Hacked title' });
    expect(upd.status).toBe(403);

    const del = await request(app).delete(`${ADMIN_NOTIF}/announcements/${id}`)
      .set('Authorization', `Bearer ${at}`);
    expect(del.status).toBe(403);
  });

  it('allows hide/show via the visibility endpoint only, with audit log', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const id = await createBteb(at);
    await request(app).post(`${ADMIN_NOTIF}/announcements/${id}/publish`).set('Authorization', `Bearer ${at}`);

    const hide = await request(app).post(`${ADMIN_NOTIF}/announcements/${id}/visibility`)
      .set('Authorization', `Bearer ${at}`).send({ visible: false });
    expect(hide.status).toBe(200);

    const pub = await request(app).get('/api/v1/notifications/announcements/published')
      .set('Authorization', `Bearer ${st}`);
    expect((pub.body.data.items as unknown[]).length).toBe(0);

    const show = await request(app).post(`${ADMIN_NOTIF}/announcements/${id}/visibility`)
      .set('Authorization', `Bearer ${at}`).send({ visible: true });
    expect(show.status).toBe(200);

    const pub2 = await request(app).get('/api/v1/notifications/announcements/published')
      .set('Authorization', `Bearer ${st}`);
    expect((pub2.body.data.items as unknown[]).length).toBe(1);

    const audit = await AuditLog.find({ action: 'announcement.visibility' });
    expect(audit.length).toBe(2);
  });

  it('visibility endpoint is admin-only and strict-validated', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const id = await createBteb(at);
    const s = await request(app).post(`${ADMIN_NOTIF}/announcements/${id}/visibility`)
      .set('Authorization', `Bearer ${st}`).send({ visible: false });
    expect(s.status).toBe(403);
    const bad = await request(app).post(`${ADMIN_NOTIF}/announcements/${id}/visibility`)
      .set('Authorization', `Bearer ${at}`).send({ visible: 'yes', extra: 1 });
    expect(bad.status).toBe(400);
  });

  it('BTEB publish flow remains allowed (sync compatibility)', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const id = await createBteb(at);
    const p = await request(app).post(`${ADMIN_NOTIF}/announcements/${id}/publish`)
      .set('Authorization', `Bearer ${at}`);
    expect(p.status).toBe(200);
    const content = await request(app).get('/api/v1/home/content').set('Authorization', `Bearer ${st}`);
    const notices = content.body.data.notices as Array<{ source: string }>;
    expect(notices).toHaveLength(1);
    expect(notices[0].source).toBe('bteb');
  });
});
