import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import bcrypt from 'bcryptjs';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

async function adminToken(): Promise<string> {
  const existing = await User.findOne({ email: 'admin@d.com' });
  if (!existing) {
    await User.create({
      name: 'Main Admin', email: 'admin@d.com',
      passwordHash: await bcrypt.hash('AdminPass123', 4), role: 'admin'
    });
  }
  const res = await request(app).post('/api/v1/auth/login')
    .send({ email: 'admin@d.com', password: 'AdminPass123' });
  return res.body.data.accessToken;
}

async function studentToken(email = 'stu@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Student One', email, password: 'Password123' });
  return res.body.data.accessToken;
}

describe('Home v2: published notices for students', () => {
  it('lists published notices with source filter and hides drafts', async () => {
    const st = await studentToken();
    const at = await adminToken();
    const ADMIN_NOTIF = '/api/v1/notifications/admin';

    const bteb = await request(app).post(`${ADMIN_NOTIF}/announcements`)
      .set('Authorization', `Bearer ${at}`)
      .send({
        title: 'BTEB routine published',
        body: 'The 5th semester routine is now available.',
        source: 'bteb',
        pdfUrl: 'https://example.com/notice.pdf'
      });
    expect(bteb.status).toBe(201);
    const btebId = bteb.body.data.item._id;

    const adminNotice = await request(app).post(`${ADMIN_NOTIF}/announcements`)
      .set('Authorization', `Bearer ${at}`)
      .send({ title: 'App update live', body: 'DiplomaBondhu v1.1 is rolling out.' });
    expect(adminNotice.status).toBe(201);

    await request(app).post(`${ADMIN_NOTIF}/announcements/${btebId}/publish`)
      .set('Authorization', `Bearer ${at}`);

    const hidden = await request(app).get('/api/v1/notifications/announcements/published')
      .set('Authorization', `Bearer ${st}`);
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.items.length).toBe(1);
    expect(hidden.body.data.items[0].source).toBe('bteb');
    expect(hidden.body.data.items[0].pdfUrl).toBe('https://example.com/notice.pdf');

    const filtered = await request(app).get('/api/v1/notifications/announcements/published?source=admin')
      .set('Authorization', `Bearer ${st}`);
    expect(filtered.body.data.items.length).toBe(0);

    const detail = await request(app).get(`/api/v1/notifications/announcements/published/${btebId}`)
      .set('Authorization', `Bearer ${st}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.item.title).toBe('BTEB routine published');
  });

  it('rejects invalid source filter and hides unpublished detail', async () => {
    const st = await studentToken();
    const at = await adminToken();
    const ADMIN_NOTIF = '/api/v1/notifications/admin';

    const draft = await request(app).post(`${ADMIN_NOTIF}/announcements`)
      .set('Authorization', `Bearer ${at}`)
      .send({ title: 'Draft only notice', body: 'Not published yet.' });
    const draftId = draft.body.data.item._id;

    const bad = await request(app).get('/api/v1/notifications/announcements/published?source=unknown')
      .set('Authorization', `Bearer ${st}`);
    expect(bad.status).toBe(200);
    expect(bad.body.data.items.length).toBe(0);

    const detail = await request(app).get(`/api/v1/notifications/announcements/published/${draftId}`)
      .set('Authorization', `Bearer ${st}`);
    expect(detail.status).toBe(404);
  });
});

describe('Home v2: student roll on profile', () => {
  it('saves roll and registrationNo via PATCH /users/me and returns them', async () => {
    const st = await studentToken();

    const updated = await request(app).patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${st}`)
      .send({ roll: '1234567', registrationNo: 'REG-2024-001' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.user.profile.roll).toBe('1234567');
    expect(updated.body.data.user.profile.registrationNo).toBe('REG-2024-001');

    const me = await request(app).get('/api/v1/users/me')
      .set('Authorization', `Bearer ${st}`);
    expect(me.body.data.user.profile.roll).toBe('1234567');
  });

  it('rejects roll longer than 32 chars', async () => {
    const st = await studentToken();
    const res = await request(app).patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${st}`)
      .send({ roll: 'x'.repeat(40) });
    expect(res.status).toBe(400);
  });
});

describe('Home v2: result display + home notice settings', () => {
  it('PUT /admin/settings persists resultDisplay and homeNotice, GET /settings/app returns them', async () => {
    const st = await studentToken();
    const at = await adminToken();

    const studentWrite = await request(app).put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${st}`)
      .send({ resultDisplay: { enabled: true } });
    expect(studentWrite.status).toBe(403);

    const updated = await request(app).put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${at}`)
      .send({
        resultDisplay: { enabled: true, examId: '5th-sem-2024', startsAt: null, endsAt: null },
        homeNotice: { text: 'Classes resume Sunday', link: '', visible: true, startsAt: null, endsAt: null }
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.settings.resultDisplay.enabled).toBe(true);
    expect(updated.body.data.settings.homeNotice.text).toBe('Classes resume Sunday');

    const pub = await request(app).get('/api/v1/settings/app');
    expect(pub.status).toBe(200);
    expect(pub.body.data.resultDisplay.enabled).toBe(true);
    expect(pub.body.data.resultDisplay.examId).toBe('5th-sem-2024');
    expect(pub.body.data.homeNotice.text).toBe('Classes resume Sunday');
    expect(pub.body.data.homeNotice.visible).toBe(true);
  });

  it('rejects invalid homeNotice payload', async () => {
    const at = await adminToken();
    const res = await request(app).put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${at}`)
      .send({ homeNotice: { text: 42, link: '', visible: true } });
    expect(res.status).toBe(400);
  });

  it('seeds new homepage sections (services, resources) on GET /settings/app', async () => {
    const res = await request(app).get('/api/v1/settings/app');
    const keys = res.body.data.homepageSections.map((s: { key: string }) => s.key);
    expect(keys).toContain('services');
    expect(keys).toContain('resources');
  });
});
