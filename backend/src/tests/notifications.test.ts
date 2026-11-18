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

const ADMIN_NOTIF = '/api/v1/notifications/admin';

describe('Notifications: inbox and announcements', () => {
  it('publishing an announcement fans out to students with unread count', async () => {
    const st = await studentToken();
    const at = await adminToken();

    const created = await request(app).post(`${ADMIN_NOTIF}/announcements`)
      .set('Authorization', `Bearer ${at}`)
      .send({ title: 'Semester final exam notice', body: 'Final exams start next month.' });
    expect(created.status).toBe(201);
    const announcementId = created.body.data.item._id;

    const empty = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${st}`);
    expect(empty.body.meta.unread).toBe(0);

    const publish = await request(app).post(`${ADMIN_NOTIF}/announcements/${announcementId}/publish`)
      .set('Authorization', `Bearer ${at}`);
    expect(publish.status).toBe(200);
    expect(publish.body.data.recipientCount).toBe(1);

    const inbox = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${st}`);
    expect(inbox.body.data.items.length).toBe(1);
    expect(inbox.body.meta.unread).toBe(1);
    const notificationId = inbox.body.data.items[0]._id;

    const read = await request(app).post(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${st}`);
    expect(read.status).toBe(200);

    const afterRead = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${st}`);
    expect(afterRead.body.meta.unread).toBe(0);
  });

  it('read-all marks everything; IDOR blocked on mark-read', async () => {
    const st = await studentToken();
    const other = await studentToken('other@d.com');
    const at = await adminToken();

    const announcement = await request(app).post(`${ADMIN_NOTIF}/announcements`)
      .set('Authorization', `Bearer ${at}`)
      .send({ title: 'General notice', body: 'Applies to all students.' });
    await request(app).post(`${ADMIN_NOTIF}/announcements/${announcement.body.data.item._id}/publish`)
      .set('Authorization', `Bearer ${at}`);

    const inbox = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${st}`);
    const notificationId = inbox.body.data.items[0]._id;

    const idor = await request(app).post(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${other}`);
    expect(idor.status).toBe(404);

    const readAll = await request(app).post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${st}`);
    expect(readAll.status).toBe(200);

    const after = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${st}`);
    expect(after.body.meta.unread).toBe(0);
  });

  it('preferences default to all-on and update per category', async () => {
    const st = await studentToken();
    const prefs = await request(app).get('/api/v1/notifications/preferences').set('Authorization', `Bearer ${st}`);
    expect(prefs.body.data.categories.material).toBe(true);

    const updated = await request(app).put('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${st}`)
      .send({ categories: { material: false, community: false } });
    expect(updated.status).toBe(200);
    expect(updated.body.data.categories.material).toBe(false);
    expect(updated.body.data.categories.exam).toBe(true);
  });

  it('students blocked from admin announcements; scheduled cannot publish early; double publish blocked', async () => {
    const st = await studentToken();
    const at = await adminToken();

    const blocked = await request(app).get(`${ADMIN_NOTIF}/announcements`)
      .set('Authorization', `Bearer ${st}`);
    expect(blocked.status).toBe(403);

    const scheduled = await request(app).post(`${ADMIN_NOTIF}/announcements`)
      .set('Authorization', `Bearer ${at}`)
      .send({ title: 'Future notice', body: 'Scheduled for later.', scheduledAt: '2099-01-01T00:00:00Z' });
    const early = await request(app).post(`${ADMIN_NOTIF}/announcements/${scheduled.body.data.item._id}/publish`)
      .set('Authorization', `Bearer ${at}`);
    expect(early.status).toBe(409);

    const now = await request(app).post(`${ADMIN_NOTIF}/announcements`)
      .set('Authorization', `Bearer ${at}`)
      .send({ title: 'Immediate notice', body: 'Publishes right away.' });
    const publish = await request(app).post(`${ADMIN_NOTIF}/announcements/${now.body.data.item._id}/publish`)
      .set('Authorization', `Bearer ${at}`);
    expect(publish.status).toBe(200);

    const again = await request(app).post(`${ADMIN_NOTIF}/announcements/${now.body.data.item._id}/publish`)
      .set('Authorization', `Bearer ${at}`);
    expect(again.status).toBe(409);
  });
});
