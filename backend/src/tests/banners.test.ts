import request from 'supertest';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import { Banner } from '../models/banner.model';
import { AuditLog } from '../models/audit-log.model';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

async function studentToken(email = 'banner-student@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Banner Student', email, password: 'Password123' });
  return res.body.data.accessToken;
}

async function adminToken(): Promise<string> {
  await User.create({
    name: 'Banner Admin', email: 'banner-admin@d.com',
    passwordHash: await bcrypt.hash('AdminPass123', 4), role: 'admin'
  });
  const res = await request(app).post('/api/v1/auth/login')
    .send({ email: 'banner-admin@d.com', password: 'AdminPass123' });
  return res.body.data.accessToken;
}

describe('banners', () => {
  it('hides drafts and expired banners from students; serves active ones by priority', async () => {
    const st = await studentToken();
    await Banner.create([
      { title: 'Draft', imageUrl: 'https://cdn.d.com/draft.png', status: 'draft' },
      { title: 'Expired', imageUrl: 'https://cdn.d.com/expired.png', status: 'published', startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() - 3600000) },
      { title: 'Scheduled', imageUrl: 'https://cdn.d.com/scheduled.png', status: 'published', startsAt: new Date(Date.now() + 86400000) },
      { title: 'Low', imageUrl: 'https://cdn.d.com/low.png', status: 'published', priority: 1 },
      { title: 'High', imageUrl: 'https://cdn.d.com/high.png', status: 'published', priority: 10 }
    ]);

    const res = await request(app).get('/api/v1/banners').set('Authorization', `Bearer ${st}`);
    expect(res.status).toBe(200);
    const titles = (res.body.data.items as Array<{ title: string }>).map((b) => b.title);
    expect(titles).toEqual(['High', 'Low']);
  });

  it('requires auth for the student endpoint', async () => {
    const res = await request(app).get('/api/v1/banners');
    expect(res.status).toBe(401);
  });

  it('admin can create, update, publish, list and soft-delete banners with audit trail', async () => {
    const ad = await adminToken();

    const created = await request(app).post('/api/v1/banners/admin')
      .set('Authorization', `Bearer ${ad}`)
      .send({ title: 'Semester Notice', imageUrl: 'https://cdn.d.com/sem.png', linkUrl: 'https://diplomabondhu.com/notice', ctaLabel: 'Details', priority: 5 });
    expect(created.status).toBe(201);
    expect(created.body.data.item.status).toBe('draft');
    const id = created.body.data.item._id as string;

    const updated = await request(app).put(`/api/v1/banners/admin/${id}`)
      .set('Authorization', `Bearer ${ad}`)
      .send({ title: 'Semester Notice Updated' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.item.title).toBe('Semester Notice Updated');

    const published = await request(app).post(`/api/v1/banners/admin/${id}/publish`)
      .set('Authorization', `Bearer ${ad}`);
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe('published');

    const listed = await request(app).get('/api/v1/banners/admin').set('Authorization', `Bearer ${ad}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.items).toHaveLength(1);

    const deleted = await request(app).delete(`/api/v1/banners/admin/${id}`)
      .set('Authorization', `Bearer ${ad}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.data.deleted).toBe(true);

    const afterDelete = await request(app).get('/api/v1/banners/admin').set('Authorization', `Bearer ${ad}`);
    expect(afterDelete.body.data.items).toHaveLength(0);

    const audits = await AuditLog.find({ action: /^banner\./ });
    expect(audits.map((a) => a.action).sort()).toEqual(['banner.create', 'banner.delete', 'banner.publish', 'banner.update']);
  });

  it('rejects student and moderator access to admin banner routes, and invalid payloads', async () => {
    const st = await studentToken();
    const denied = await request(app).get('/api/v1/banners/admin').set('Authorization', `Bearer ${st}`);
    expect(denied.status).toBe(403);

    const ad = await adminToken();
    const badUrl = await request(app).post('/api/v1/banners/admin')
      .set('Authorization', `Bearer ${ad}`)
      .send({ imageUrl: 'not-a-url' });
    expect(badUrl.status).toBe(400);

    const missing = await request(app).post('/api/v1/banners/admin')
      .set('Authorization', `Bearer ${ad}`)
      .send({ title: 'No image' });
    expect(missing.status).toBe(400);
  });
});
