import request from 'supertest';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import { Banner } from '../models/banner.model';
import { CommunityPost } from '../models/community-post.model';
import { Announcement } from '../models/announcement.model';
import { StudyMaterial } from '../models/study-material.model';
import { Question } from '../models/question.model';
import { adminDeleteQuestion } from '../modules/exams/exam.service';
import { adminSoftDeleteMaterial } from '../modules/materials/materials.service';
import { deleteAnnouncement } from '../modules/notifications/notifications.service';

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

describe('version safety', () => {
  it('optimisticConcurrency: stale save() throws VersionError', async () => {
    const doc = await Banner.create({ title: 'A', imageUrl: 'https://cdn.d.com/a.png' });
    const stale = await Banner.findById(doc._id);
    doc.title = 'First';
    await doc.save();
    stale!.title = 'Second';
    await expect(stale!.save()).rejects.toBeInstanceOf(mongoose.Error.VersionError);
  });

  it('query-based content update with withVersionBump increments __v', async () => {
    const doc = await Banner.create({ title: 'A', imageUrl: 'https://cdn.d.com/a.png' });
    expect(doc.__v).toBe(0);
    await Banner.updateOne({ _id: doc._id }, { $set: { title: 'B' }, $inc: { __v: 1 } });
    const after = await Banner.findById(doc._id);
    expect(after!.__v).toBe(1);
    expect(after!.title).toBe('B');
  });

  it('counter-only $inc does not bump __v (no version conflict for likes)', async () => {
    const user = await User.create({ name: 'Stu', email: 'vs@d.com', passwordHash: 'x' });
    const post = await CommunityPost.create({ authorId: user._id, title: 'T', body: 'B' });
    expect(post.__v).toBe(0);
    await CommunityPost.updateOne({ _id: post._id }, { $inc: { likeCount: 1 } });
    const after = await CommunityPost.findById(post._id);
    expect(after!.likeCount).toBe(1);
    expect(after!.__v).toBe(0);
  });

  it('soft-delete write paths bump __v: announcement, material, question', async () => {
    const user = await User.create({ name: 'Stu2', email: 'vs2@d.com', passwordHash: 'x' });

    const ann = await Announcement.create({ title: 'Some long title here', body: 'Body', source: 'admin' });
    await deleteAnnouncement(String(ann._id), String(user._id));
    const annAfter = await Announcement.findById(ann._id);
    expect(annAfter!.deletedAt).not.toBeNull();
    expect(annAfter!.__v).toBe(1);

    const mat = await StudyMaterial.create({ type: 'book', title: 'M', status: 'published' });
    await adminSoftDeleteMaterial(String(mat._id), String(user._id));
    const matAfter = await StudyMaterial.findById(mat._id);
    expect(matAfter!.deletedAt).not.toBeNull();
    expect(matAfter!.__v).toBe(1);

    const q = await Question.create({ text: 'What is 2+2?', options: [{ key: 'A', text: '4' }], correctKey: 'A', status: 'published' });
    await adminDeleteQuestion(String(q._id), String(user._id));
    const qAfter = await Question.findById(q._id);
    expect(qAfter!.deletedAt).not.toBeNull();
    expect(qAfter!.__v).toBe(1);
  });

  it('error handler maps VersionError to HTTP 409', async () => {
    const { errorHandler } = await import('../middlewares/error-handler');
    const req = {} as never;
    let statusCode = 0;
    const res = {
      status(c: number) { statusCode = c; return { json: () => undefined }; }
    } as never as Parameters<typeof errorHandler>[2];
    const stale = await Banner.create({ title: 'A', imageUrl: 'https://cdn.d.com/a.png' });
    const doc = await Banner.findById(stale._id);
    stale.title = 'X';
    await stale.save();
    doc!.title = 'Y';
    let caught: unknown;
    try { await doc!.save(); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(mongoose.Error.VersionError);
    const next = vi.fn();
    errorHandler(caught, req, res, next);
    expect(statusCode).toBe(409);
    expect(next).not.toHaveBeenCalled();
  });
});
