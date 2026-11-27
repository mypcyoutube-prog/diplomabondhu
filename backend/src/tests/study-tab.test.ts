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

function materialBody(overrides: Record<string, unknown> = {}) {
  return {
    type: 'book',
    title: 'Computer Fundamentals - Chapter 1',
    payload: { externalUrl: 'https://example.org/book.pdf' },
    downloadAllowed: false,
    ...overrides
  };
}

async function createPublishedMaterial(at: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const created = await request(app).post('/api/v1/materials/admin/materials')
    .set('Authorization', `Bearer ${at}`)
    .send(materialBody(overrides));
  expect(created.status).toBe(201);
  const id = created.body.data.item._id as string;
  const published = await request(app).post(`/api/v1/materials/admin/materials/${id}/publish`)
    .set('Authorization', `Bearer ${at}`);
  expect(published.status).toBe(200);
  return id;
}

describe('Study Tab upgrade: sort, counts, reports, preview, settings', () => {
  it('supports oldest sort ordering', async () => {
    const at = await adminToken();
    const st = await studentToken();
    await createPublishedMaterial(at, { title: 'Older Book', payload: { externalUrl: 'https://example.org/a.pdf' } });
    await new Promise((r) => setTimeout(r, 20));
    await createPublishedMaterial(at, { title: 'Newer Book', payload: { externalUrl: 'https://example.org/b.pdf' } });

    const res = await request(app).get('/api/v1/materials?sort=oldest')
      .set('Authorization', `Bearer ${st}`);
    expect(res.status).toBe(200);
    const titles = res.body.data.items.map((i: { title: string }) => i.title);
    expect(titles.indexOf('Older Book')).toBeLessThan(titles.indexOf('Newer Book'));
  });

  it('returns per-type category counts alongside list', async () => {
    const at = await adminToken();
    const st = await studentToken();
    await createPublishedMaterial(at, { type: 'book' });
    await createPublishedMaterial(at, { type: 'note', title: 'Note One', payload: { externalUrl: 'https://example.org/n.pdf' } });
    await request(app).post('/api/v1/materials/admin/materials')
      .set('Authorization', `Bearer ${at}`)
      .send(materialBody({ type: 'video', title: 'Draft Video', payload: { externalUrl: 'https://example.org/v.mp4' } }));

    const res = await request(app).get('/api/v1/materials?type=book')
      .set('Authorization', `Bearer ${st}`);
    expect(res.status).toBe(200);
    const counts = res.body.meta.counts;
    expect(counts.book).toBe(1);
    expect(counts.note).toBe(1);
    expect(counts.video).toBeUndefined();
  });

  it('persists new payload metadata fields and previewAllowed', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const id = await createPublishedMaterial(at, {
      payload: {
        externalUrl: 'https://example.org/b.pdf',
        thumbnailUrl: 'https://example.org/cover.jpg',
        author: 'A. Karim',
        edition: '3rd',
        durationSec: 720
      },
      previewAllowed: false
    });

    const res = await request(app).get(`/api/v1/materials/${id}`)
      .set('Authorization', `Bearer ${st}`);
    expect(res.status).toBe(200);
    expect(res.body.data.item.payload.thumbnailUrl).toBe('https://example.org/cover.jpg');
    expect(res.body.data.item.payload.author).toBe('A. Karim');
    expect(res.body.data.item.payload.edition).toBe('3rd');
    expect(res.body.data.item.payload.durationSec).toBe(720);
    expect(res.body.data.item.previewAllowed).toBe(false);
  });

  it('rejects report without reasonCode or reason; accepts structured report', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const id = await createPublishedMaterial(at);

    const bad = await request(app).post(`/api/v1/materials/${id}/report`)
      .set('Authorization', `Bearer ${st}`)
      .send({ details: 'no code given' });
    expect(bad.status).toBe(400);

    const good = await request(app).post(`/api/v1/materials/${id}/report`)
      .set('Authorization', `Bearer ${st}`)
      .send({ reasonCode: 'broken_link', details: 'Link returns 404' });
    expect(good.status).toBe(201);

    const adminList = await request(app).get('/api/v1/materials/admin/materials/reports?status=open')
      .set('Authorization', `Bearer ${at}`);
    expect(adminList.status).toBe(200);
    const item = adminList.body.data.items[0];
    expect(item.reasonCode).toBe('broken_link');
    expect(item.details).toBe('Link returns 404');
  });

  it('prevents duplicate open reports by the same student; allows after resolve', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const id = await createPublishedMaterial(at);

    const first = await request(app).post(`/api/v1/materials/${id}/report`)
      .set('Authorization', `Bearer ${st}`)
      .send({ reasonCode: 'wrong_info' });
    expect(first.status).toBe(201);

    const dup = await request(app).post(`/api/v1/materials/${id}/report`)
      .set('Authorization', `Bearer ${st}`)
      .send({ reasonCode: 'wrong_info' });
    expect(dup.status).toBe(409);

    const reports = await request(app).get('/api/v1/materials/admin/materials/reports?status=open')
      .set('Authorization', `Bearer ${at}`);
    const reportId = reports.body.data.items[0]._id as string;
    await request(app).post(`/api/v1/materials/admin/materials/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${at}`)
      .send({ status: 'resolved' });

    const again = await request(app).post(`/api/v1/materials/${id}/report`)
      .set('Authorization', `Bearer ${st}`)
      .send({ reasonCode: 'other' });
    expect(again.status).toBe(201);
  });

  it('admin settings persist libraryCategories and students receive them', async () => {
    const at = await adminToken();
    const st = await studentToken();

    const put = await request(app).put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${at}`)
      .send({ libraryCategories: { video: false } });
    expect(put.status).toBe(200);
    expect(put.body.data.settings.libraryCategories.video).toBe(false);
    expect(put.body.data.settings.libraryCategories.book).toBe(true);

    const appSettings = await request(app).get('/api/v1/settings/app')
      .set('Authorization', `Bearer ${st}`);
    expect(appSettings.status).toBe(200);
    expect(appSettings.body.data.libraryCategories).toEqual({
      book: true, note: true, video: false, subject_material: true, past_question: true
    });
  });

  it('rejects invalid libraryCategories payload from students and bad values', async () => {
    const at = await adminToken();
    const st = await studentToken();

    const forbidden = await request(app).put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${st}`)
      .send({ libraryCategories: { video: false } });
    expect(forbidden.status).toBe(403);

    const invalid = await request(app).put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${at}`)
      .send({ libraryCategories: { video: 'yes' } });
    expect(invalid.status).toBe(400);
  });
});
