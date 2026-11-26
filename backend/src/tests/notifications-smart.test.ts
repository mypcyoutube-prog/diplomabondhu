import request from 'supertest';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import { Announcement } from '../models/announcement.model';
import { processDueAnnouncements } from '../modules/notifications/notifications.service';
import mongoose from 'mongoose';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

async function studentToken(email = 'smartn@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Notify Student', email, password: 'Password123' });
  return res.body.data.accessToken;
}

async function adminToken(): Promise<string> {
  await User.create({
    name: 'Main Admin', email: 'admin-smartn@d.com',
    passwordHash: await bcrypt.hash('AdminPass123', 4), role: 'admin'
  });
  const res = await request(app).post('/api/v1/auth/login')
    .send({ email: 'admin-smartn@d.com', password: 'AdminPass123' });
  return res.body.data.accessToken;
}

describe('smart notifications', () => {
  it('stores and returns quiet hours preferences', async () => {
    const st = await studentToken();
    const put = await request(app).put('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${st}`)
      .send({
        categories: { material: false },
        quietHours: { enabled: true, start: '23:00', end: '06:30' }
      });
    expect(put.status).toBe(200);
    expect(put.body.data.quietHours.enabled).toBe(true);
    expect(put.body.data.quietHours.start).toBe('23:00');

    const get = await request(app).get('/api/v1/notifications/preferences').set('Authorization', `Bearer ${st}`);
    expect(get.body.data.quietHours.enabled).toBe(true);

    const bad = await request(app).put('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${st}`)
      .send({ quietHours: { enabled: true, start: '25:99', end: '06:30' } });
    expect(bad.status).toBe(400);
  });

  it('auto-publishes due scheduled announcements exactly once (dedup)', async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Stu A', email: 'na@d.com', password: 'Password123' });
    await request(app).post('/api/v1/auth/register').send({ name: 'Stu B', email: 'nb@d.com', password: 'Password123' });

    const admin = await adminToken();
    const created = await request(app).post('/api/v1/notifications/admin/announcements')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        title: 'Scheduled maintenance notice',
        body: 'The app will be briefly unavailable tonight.',
        category: 'system',
        targeting: { all: true, programIds: [], technologyIds: [], semesterIds: [] },
        scheduledAt: new Date(Date.now() - 5000).toISOString()
      });
    expect(created.status).toBe(201);

    const firstRun = await processDueAnnouncements();
    expect(firstRun).toHaveLength(1);

    const secondRun = await processDueAnnouncements();
    expect(secondRun).toHaveLength(0);

    for (const email of ['na@d.com', 'nb@d.com']) {
      const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'Password123' });
      const inbox = await request(app).get('/api/v1/notifications')
        .set('Authorization', `Bearer ${login.body.data.accessToken}`);
      const matching = inbox.body.data.items.filter((n: { title: string }) => n.title === 'Scheduled maintenance notice');
      expect(matching).toHaveLength(1);
    }
  });

  it('serves delivery stats to admins only', async () => {
    const admin = await adminToken();
    const st = await studentToken();

    const stats = await request(app).get('/api/v1/notifications/admin/delivery-stats')
      .set('Authorization', `Bearer ${admin}`);
    expect(stats.status).toBe(200);
    expect(stats.body.data).toHaveProperty('total');
    expect(stats.body.data).toHaveProperty('scheduledAnnouncements');

    const blocked = await request(app).get('/api/v1/notifications/admin/delivery-stats')
      .set('Authorization', `Bearer ${st}`);
    expect(blocked.status).toBe(403);
  });
});
