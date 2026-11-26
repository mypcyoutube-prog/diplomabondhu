import request from 'supertest';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { WorkspaceNote } from '../models/workspace-note.model';
import { StudyMaterial } from '../models/study-material.model';
import { MaterialView } from '../models/material-view.model';


const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

async function studentToken(email = 'ws@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Workspace Student', email, password: 'Password123' });
  return res.body.data.accessToken;
}

async function currentUserId(token: string): Promise<string> {
  const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
  return String(res.body.data.user._id ?? res.body.data.user.id);
}


describe('workspace notes', () => {
  it('creates, lists, searches, archives and soft-deletes notes with ownership isolation', async () => {
    const a = await studentToken();
    const b = await studentToken('ws2@d.com');

    const created = await request(app).post('/api/v1/workspace/notes')
      .set('Authorization', `Bearer ${a}`)
      .send({ title: 'Ohm law note', body: 'V = IR explanation', pinned: true });
    expect(created.status).toBe(201);
    const noteId = String(created.body.data.item._id);

    await request(app).post('/api/v1/workspace/notes')
      .set('Authorization', `Bearer ${a}`)
      .send({ title: 'Chemistry note', body: 'periodic trends' });

    const list = await request(app).get('/api/v1/workspace/notes').set('Authorization', `Bearer ${a}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(2);
    expect(list.body.data.items[0].title).toBe('Ohm law note');

    const bList = await request(app).get('/api/v1/workspace/notes').set('Authorization', `Bearer ${b}`);
    expect(bList.body.data.items).toHaveLength(0);

    const search = await request(app).get('/api/v1/workspace/notes?q=ohm').set('Authorization', `Bearer ${a}`);
    expect(search.body.data.items).toHaveLength(1);

    const update = await request(app).put(`/api/v1/workspace/notes/${noteId}`)
      .set('Authorization', `Bearer ${a}`)
      .send({ archived: true });
    expect(update.status).toBe(200);
    expect(update.body.data.item.archived).toBe(true);

    const archived = await request(app).get('/api/v1/workspace/notes?archived=true').set('Authorization', `Bearer ${a}`);
    expect(archived.body.data.items).toHaveLength(1);

    const del = await request(app).delete(`/api/v1/workspace/notes/${noteId}`).set('Authorization', `Bearer ${a}`);
    expect(del.status).toBe(200);
    const after = await request(app).get('/api/v1/workspace/notes').set('Authorization', `Bearer ${a}`);
    expect(after.body.data.items).toHaveLength(1);

    const foreign = await request(app).delete(`/api/v1/workspace/notes/${noteId}`).set('Authorization', `Bearer ${b}`);
    expect(foreign.status).toBe(404);
  });

  it('validates note bodies and collection references', async () => {
    const a = await studentToken();
    const bad = await request(app).post('/api/v1/workspace/notes')
      .set('Authorization', `Bearer ${a}`)
      .send({ title: '', body: '' });
    expect(bad.status).toBe(400);

    const badCollection = await request(app).post('/api/v1/workspace/notes')
      .set('Authorization', `Bearer ${a}`)
      .send({ title: 'T', body: 'B', collectionId: 'not-an-object-id' });
    expect(badCollection.status).toBe(400);
  });
});

describe('workspace collections, recent and bookmarks', () => {
  it('manages collections and items with duplicate-name protection', async () => {
    const a = await studentToken();
    const c1 = await request(app).post('/api/v1/workspace/collections')
      .set('Authorization', `Bearer ${a}`)
      .send({ name: 'Semester 5 revision' });
    expect(c1.status).toBe(201);

    const dup = await request(app).post('/api/v1/workspace/collections')
      .set('Authorization', `Bearer ${a}`)
      .send({ name: 'Semester 5 revision' });
    expect(dup.status).toBe(409);

    const userId = await currentUserId(a);
    const note = await WorkspaceNote.create({
      userId: new mongoose.Types.ObjectId(userId),
      title: 'Collect me',
      body: 'body'
    });

    const add = await request(app).post(`/api/v1/workspace/collections/${String(c1.body.data.item._id)}/items`)
      .set('Authorization', `Bearer ${a}`)
      .send({ refType: 'note', refId: String(note._id) });
    expect(add.status).toBe(201);
    expect(add.body.data.item.items).toHaveLength(1);

    const material = await StudyMaterial.create({ type: 'book', title: 'Physics Book', status: 'published' });
    const addMaterial = await request(app).post(`/api/v1/workspace/collections/${String(c1.body.data.item._id)}/items`)
      .set('Authorization', `Bearer ${a}`)
      .send({ refType: 'material', refId: String(material._id) });
    expect(addMaterial.status).toBe(201);
    expect(addMaterial.body.data.item.items).toHaveLength(2);

    const foreignMaterial = await StudyMaterial.create({ type: 'book', title: 'Unpublished', status: 'draft' });
    const addDraft = await request(app).post(`/api/v1/workspace/collections/${String(c1.body.data.item._id)}/items`)
      .set('Authorization', `Bearer ${a}`)
      .send({ refType: 'material', refId: String(foreignMaterial._id) });
    expect(addDraft.status).toBe(404);

    const remove = await request(app).delete(`/api/v1/workspace/collections/${String(c1.body.data.item._id)}/items/${String(note._id)}`)
      .set('Authorization', `Bearer ${a}`);
    expect(remove.status).toBe(200);
    expect(remove.body.data.item.items).toHaveLength(1);
  });

  it('returns recent views scoped to the owner', async () => {
    const a = await studentToken();
    const material = await StudyMaterial.create({ type: 'note', title: 'Recent Material', status: 'published' });
    const userId = await currentUserId(a);
    await MaterialView.create({ userId: new mongoose.Types.ObjectId(userId), materialId: material._id });

    const recent = await request(app).get('/api/v1/workspace/recent').set('Authorization', `Bearer ${a}`);
    expect(recent.status).toBe(200);
    expect(recent.body.data.items[0].title).toBe('Recent Material');
  });
});
