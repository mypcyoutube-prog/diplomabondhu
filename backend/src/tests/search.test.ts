import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { CommunityPost } from '../models/community-post.model';
import { Exam } from '../models/exam.model';
import { StudyMaterial } from '../models/study-material.model';

const app = createApp(testEnv);

beforeAll(async () => {
  await startMongo();
});

afterAll(async () => {
  await stopMongo();
});

beforeEach(async () => {
  await clearDb();
});

describe('global search', () => {
  it('requires a query with at least 2 characters', async () => {
    expect((await request(app).get('/api/v1/search')).status).toBe(400);
    expect((await request(app).get('/api/v1/search?q=a')).status).toBe(400);
  });

  it('returns grouped results across published materials, exams and visible posts', async () => {
    await StudyMaterial.create({ type: 'book', title: 'Higher Math Guide', status: 'published' });
    await StudyMaterial.create({ type: 'note', title: 'Hidden Draft', status: 'draft' });
    await Exam.create({ title: 'Math Semester Final', type: 'subject', durationSec: 600, marksPerQuestion: 1, status: 'published' });
    await Exam.create({ title: 'Draft Exam Math', type: 'subject', durationSec: 600, marksPerQuestion: 1, status: 'draft' });
    const author = new mongoose.Types.ObjectId();
    await CommunityPost.create({ authorId: author, title: 'Math tips thread', body: 'How to prepare for math exam' });
    await CommunityPost.create({ authorId: author, title: 'Hidden post about math', body: 'secret', status: 'hidden' });

    const res = await request(app).get('/api/v1/search?q=math');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.types.material.count).toBe(1);
    expect(res.body.data.types.material.items[0].title).toBe('Higher Math Guide');
    expect(res.body.data.types.exam.count).toBe(1);
    expect(res.body.data.types.exam.items[0].title).toBe('Math Semester Final');
    expect(res.body.data.types.post.count).toBe(1);
    expect(res.body.data.types.post.items[0].title).toBe('Math tips thread');
  });

  it('searches Bangla titles and paginates a single type', async () => {
    await StudyMaterial.create({ type: 'book', title: 'গণিত বই', titleBn: 'গণিত', status: 'published' });
    for (let i = 1; i <= 25; i++) {
      await StudyMaterial.create({ type: 'note', title: `Chemistry note ${i}`, status: 'published' });
    }

    const bn = await request(app).get('/api/v1/search?q=%E0%A6%97%E0%A6%A3%E0%A6%BF%E0%A6%A4&type=material');
    expect(bn.status).toBe(200);
    expect(bn.body.data.items).toHaveLength(1);

    const paged = await request(app).get('/api/v1/search?q=chemistry&type=material&page=2');
    expect(paged.status).toBe(200);
    expect(paged.body.data.items).toHaveLength(5);
    expect(paged.body.meta.total).toBe(25);
    expect(paged.body.meta.totalPages).toBe(2);
  });

  it('never returns drafts, hidden or deleted docs', async () => {
    await StudyMaterial.create({ type: 'book', title: 'Deleted Math', status: 'published' });
    await StudyMaterial.deleteOne({ title: 'Deleted Math' });
    await StudyMaterial.create({ type: 'book', title: 'Deleted Math', status: 'published', deletedAt: new Date() });

    const res = await request(app).get('/api/v1/search?q=deleted');
    expect(res.status).toBe(200);
    expect(res.body.data.types.material.count).toBe(0);
  });
});

describe('health endpoint', () => {
  it('reports db status, version and uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('up');
    expect(typeof res.body.version).toBe('string');
    expect(res.body.version).not.toBe('');
    expect(res.body.uptimeSec).toBeGreaterThanOrEqual(0);
  });
});
