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
    description: 'Introductory book for first semester',
    payload: { externalUrl: 'https://example.org/book.pdf' },
    downloadAllowed: false,
    ...overrides
  };
}

async function createPublishedMaterial(at: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const { __stayDraft, ...bodyOverrides } = overrides;
  const created = await request(app).post('/api/v1/materials/admin/materials')
    .set('Authorization', `Bearer ${at}`)
    .send(materialBody(bodyOverrides));
  expect(created.status).toBe(201);
  const id = created.body.data.item._id as string;
  if (__stayDraft) return id;
  const published = await request(app).post(`/api/v1/materials/admin/materials/${id}/publish`)
    .set('Authorization', `Bearer ${at}`);
  expect(published.status).toBe(200);
  return id;
}

describe('Study Library: visibility and admin lifecycle', () => {
  it('hides drafts from students; publishes and shows them', async () => {
    const at = await adminToken();
    const st = await studentToken();

    const draftId = await createPublishedMaterial(at, { title: 'Draft Only Book', __stayDraft: true });
    const listBefore = await request(app).get('/api/v1/materials').set('Authorization', `Bearer ${st}`);
    expect(listBefore.body.data.items.some((i: { _id: string }) => i._id === draftId)).toBe(false);

    const direct = await request(app).get(`/api/v1/materials/${draftId}`).set('Authorization', `Bearer ${st}`);
    expect(direct.status).toBe(404);

    await request(app).post(`/api/v1/materials/admin/materials/${draftId}/publish`)
      .set('Authorization', `Bearer ${at}`);
    const listAfter = await request(app).get('/api/v1/materials').set('Authorization', `Bearer ${st}`);
    expect(listAfter.body.data.items.some((i: { _id: string }) => i._id === draftId)).toBe(true);
  });

  it('admin can unpublish and soft-delete; both hide material from students', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const id = await createPublishedMaterial(at);

    await request(app).post(`/api/v1/materials/admin/materials/${id}/unpublish`)
      .set('Authorization', `Bearer ${at}`);
    const afterUnpublish = await request(app).get('/api/v1/materials').set('Authorization', `Bearer ${st}`);
    expect(afterUnpublish.body.data.items.length).toBe(0);

    await request(app).post(`/api/v1/materials/admin/materials/${id}/publish`)
      .set('Authorization', `Bearer ${at}`);
    await request(app).delete(`/api/v1/materials/admin/materials/${id}`)
      .set('Authorization', `Bearer ${at}`);
    const afterDelete = await request(app).get('/api/v1/materials').set('Authorization', `Bearer ${st}`);
    expect(afterDelete.body.data.items.length).toBe(0);
  });

  it('blocks students from admin material routes', async () => {
    const st = await studentToken();
    const res = await request(app).get('/api/v1/materials/admin/materials')
      .set('Authorization', `Bearer ${st}`);
    expect(res.status).toBe(403);
  });

  it('validates material body: unknown fields and missing url rejected', async () => {
    const at = await adminToken();
    const bad = await request(app).post('/api/v1/materials/admin/materials')
      .set('Authorization', `Bearer ${at}`)
      .send({ ...materialBody(), role: 'admin' });
    expect(bad.status).toBe(400);

    const noUrl = await request(app).post('/api/v1/materials/admin/materials')
      .set('Authorization', `Bearer ${at}`)
      .send({ type: 'note', title: 'No URL note' });
    expect(noUrl.status).toBe(400);
  });
});

describe('Study Library: search, filters, sorting, pagination', () => {
  it('filters by type and examYear and searches text', async () => {
    const at = await adminToken();
    const st = await studentToken();
    await createPublishedMaterial(at, { type: 'book', title: 'Mathematics Book', titleBn: 'গণিত বই' });
    await createPublishedMaterial(at, { type: 'note', title: 'Physics Note', titleBn: 'পদার্থবিজ্ঞান নোট' });
    await createPublishedMaterial(at, { type: 'video', title: 'Mathematics Video Lesson', payload: { externalUrl: 'https://youtu.be/x' } });
    await createPublishedMaterial(at, { type: 'past_question', title: '2023 Question Paper', payload: { externalUrl: 'https://example.org/q.pdf', examYear: 2023 } });

    const books = await request(app).get('/api/v1/materials?type=book').set('Authorization', `Bearer ${st}`);
    expect(books.body.data.items.length).toBe(1);

    const year = await request(app).get('/api/v1/materials?type=past_question&examYear=2023').set('Authorization', `Bearer ${st}`);
    expect(year.body.data.items.length).toBe(1);
    expect(year.body.data.items[0].title).toContain('2023');

    const search = await request(app).get('/api/v1/materials?q=video').set('Authorization', `Bearer ${st}`);
    expect(search.body.data.items.length).toBe(1);
    expect(search.body.data.items[0].type).toBe('video');

    const bangla = await request(app).get('/api/v1/materials?q=গণিত').set('Authorization', `Bearer ${st}`);
    expect(bangla.body.data.items.length).toBe(1);
    expect(bangla.body.data.items[0].title).toContain('Mathematics Book');
  });
});

describe('Study Library: views, recent, bookmarks, download, reports', () => {
  it('increments viewCount and records recently viewed for authed users', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const id = await createPublishedMaterial(at);

    await request(app).get(`/api/v1/materials/${id}`).set('Authorization', `Bearer ${st}`);
    await request(app).get(`/api/v1/materials/${id}`).set('Authorization', `Bearer ${st}`);

    const detail = await request(app).get(`/api/v1/materials/admin/materials/${id}`)
      .set('Authorization', `Bearer ${at}`);
    expect(detail.body.data.item.viewCount).toBe(2);

    const recent = await request(app).get('/api/v1/materials/recent').set('Authorization', `Bearer ${st}`);
    expect(recent.status).toBe(200);
    expect(recent.body.data.items.length).toBe(1);
    expect(recent.body.data.items[0]._id).toBe(id);
  });

  it('anonymous views do not crash and do not record recent', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const id = await createPublishedMaterial(at);
    const anon = await request(app).get(`/api/v1/materials/${id}`);
    expect(anon.status).toBe(200);
    const recent = await request(app).get('/api/v1/materials/recent').set('Authorization', `Bearer ${st}`);
    expect(recent.body.data.items.length).toBe(0);
  });

  it('bookmarks: add, list, idempotent re-add, remove, remove-again 404', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const id = await createPublishedMaterial(at);

    const add = await request(app).post(`/api/v1/materials/${id}/bookmark`).set('Authorization', `Bearer ${st}`);
    expect(add.status).toBe(201);
    const reAdd = await request(app).post(`/api/v1/materials/${id}/bookmark`).set('Authorization', `Bearer ${st}`);
    expect(reAdd.status).toBe(201);

    const list = await request(app).get('/api/v1/materials/bookmarks').set('Authorization', `Bearer ${st}`);
    expect(list.body.data.items.length).toBe(1);
    expect(list.body.data.items[0]._id).toBe(id);

    const remove = await request(app).delete(`/api/v1/materials/${id}/bookmark`).set('Authorization', `Bearer ${st}`);
    expect(remove.status).toBe(200);
    const removeAgain = await request(app).delete(`/api/v1/materials/${id}/bookmark`).set('Authorization', `Bearer ${st}`);
    expect(removeAgain.status).toBe(404);

    const empty = await request(app).get('/api/v1/materials/bookmarks').set('Authorization', `Bearer ${st}`);
    expect(empty.body.data.items.length).toBe(0);
  });

  it('requires auth for bookmarks and reports', async () => {
    const at = await adminToken();
    const id = await createPublishedMaterial(at);
    const noAuthBookmark = await request(app).post(`/api/v1/materials/${id}/bookmark`);
    expect(noAuthBookmark.status).toBe(401);
    const noAuthReport = await request(app).post(`/api/v1/materials/${id}/report`).send({ reason: 'broken link here' });
    expect(noAuthReport.status).toBe(401);
  });

  it('download respects downloadAllowed flag', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const blockedId = await createPublishedMaterial(at, { downloadAllowed: false });
    const blocked = await request(app).get(`/api/v1/materials/download/${blockedId}`)
      .set('Authorization', `Bearer ${st}`);
    expect(blocked.status).toBe(403);

    const allowedId = await createPublishedMaterial(at, {
      downloadAllowed: true, payload: { fileUrl: 'https://cdn.example.org/notes.pdf' }
    });
    const allowed = await request(app).get(`/api/v1/materials/download/${allowedId}`)
      .set('Authorization', `Bearer ${st}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.url).toBe('https://cdn.example.org/notes.pdf');
  });

  it('reports: student reports, admin lists open reports and resolves them', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const id = await createPublishedMaterial(at);

    const short = await request(app).post(`/api/v1/materials/${id}/report`)
      .set('Authorization', `Bearer ${st}`).send({ reason: 'bad' });
    expect(short.status).toBe(400);

    const report = await request(app).post(`/api/v1/materials/${id}/report`)
      .set('Authorization', `Bearer ${st}`).send({ reason: 'The link is broken, please fix' });
    expect(report.status).toBe(201);

    const open = await request(app).get('/api/v1/materials/admin/materials/reports?status=open')
      .set('Authorization', `Bearer ${at}`);
    expect(open.body.data.items.length).toBe(1);
    const reportId = open.body.data.items[0]._id as string;

    const resolve = await request(app).post(`/api/v1/materials/admin/materials/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${at}`)
      .send({ status: 'resolved', note: 'Link fixed' });
    expect(resolve.status).toBe(200);

    const reopen = await request(app).post(`/api/v1/materials/admin/materials/reports/${reportId}/resolve`)
      .set('Authorization', `Bearer ${at}`).send({ status: 'dismissed' });
    expect(reopen.status).toBe(409);
  });
});
