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

async function acceptedStudent(email?: string): Promise<string> {
  const st = await studentToken(email);
  await request(app).post('/api/v1/community/guidelines/accept')
    .set('Authorization', `Bearer ${st}`);
  return st;
}

describe('Community: guidelines gate', () => {
  it('blocks posting until guidelines are accepted', async () => {
    const st = await studentToken();
    const blocked = await request(app).post('/api/v1/community/posts')
      .set('Authorization', `Bearer ${st}`)
      .send({ title: 'How to study DLD?', body: 'I need advice about Digital Logic Design.', type: 'question' });
    expect(blocked.status).toBe(403);

    const accept = await request(app).post('/api/v1/community/guidelines/accept')
      .set('Authorization', `Bearer ${st}`);
    expect(accept.status).toBe(200);

    const allowed = await request(app).post('/api/v1/community/posts')
      .set('Authorization', `Bearer ${st}`)
      .send({ title: 'How to study DLD?', body: 'I need advice about Digital Logic Design.', type: 'question' });
    expect(allowed.status).toBe(201);
  });

  it('serves guidelines to authenticated users', async () => {
    const st = await studentToken();
    const res = await request(app).get('/api/v1/community/guidelines').set('Authorization', `Bearer ${st}`);
    expect(res.status).toBe(200);
    expect(res.body.data.rules.length).toBeGreaterThan(0);
  });
});

describe('Community: posts, likes, comments', () => {
  it('creates post, appears in feed, deleted posts excluded', async () => {
    const st = await acceptedStudent();
    const post = await request(app).post('/api/v1/community/posts')
      .set('Authorization', `Bearer ${st}`)
      .send({ title: 'Study group for semester 5', body: 'Anyone interested in a CMT semester 5 study group?', tags: ['study-group'] });
    expect(post.status).toBe(201);
    const postId = post.body.data.item._id;

    const feed = await request(app).get('/api/v1/community/posts').set('Authorization', `Bearer ${st}`);
    expect(feed.body.data.items.length).toBe(1);

    await request(app).delete(`/api/v1/community/posts/${postId}`).set('Authorization', `Bearer ${st}`);
    const after = await request(app).get('/api/v1/community/posts').set('Authorization', `Bearer ${st}`);
    expect(after.body.data.items.length).toBe(0);
  });

  it('like/unlike updates count without duplicates', async () => {
    const st = await acceptedStudent();
    const other = await acceptedStudent('other@d.com');
    const post = await request(app).post('/api/v1/community/posts')
      .set('Authorization', `Bearer ${st}`)
      .send({ title: 'Discuss 2022 regulation', body: 'What changed in Probidhan 2022 grading?' });
    const postId = post.body.data.item._id;

    await request(app).post(`/api/v1/community/posts/${postId}/like`).set('Authorization', `Bearer ${other}`);
    await request(app).post(`/api/v1/community/posts/${postId}/like`).set('Authorization', `Bearer ${other}`);
    const detail = await request(app).get(`/api/v1/community/posts/${postId}`).set('Authorization', `Bearer ${st}`);
    expect(detail.body.data.post.likeCount).toBe(1);

    await request(app).delete(`/api/v1/community/posts/${postId}/like`).set('Authorization', `Bearer ${other}`);
    const after = await request(app).get(`/api/v1/community/posts/${postId}`).set('Authorization', `Bearer ${st}`);
    expect(after.body.data.post.likeCount).toBe(0);
  });

  it('comments with replies; comment count maintained', async () => {
    const st = await acceptedStudent();
    const other = await acceptedStudent('other@d.com');
    const post = await request(app).post('/api/v1/community/posts')
      .set('Authorization', `Bearer ${st}`)
      .send({ title: 'Best book for communication?', body: 'Suggest a good book for Communication Engineering please.' });
    const postId = post.body.data.item._id;

    const comment = await request(app).post(`/api/v1/community/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${other}`)
      .send({ text: 'Boyd is a classic choice.' });
    expect(comment.status).toBe(201);
    const commentId = comment.body.data.item._id;

    const reply = await request(app).post(`/api/v1/community/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${st}`)
      .send({ text: 'Thanks! Any Bangla alternative?', parentId: commentId });
    expect(reply.status).toBe(201);
    expect(reply.body.data.item.parentId).toBe(commentId);

    const detail = await request(app).get(`/api/v1/community/posts/${postId}`).set('Authorization', `Bearer ${st}`);
    expect(detail.body.data.comments.length).toBe(2);
    expect(detail.body.data.post.commentCount).toBe(2);
  });

  it('author-only edit; non-author gets 403', async () => {
    const st = await acceptedStudent();
    const other = await acceptedStudent('other@d.com');
    const post = await request(app).post('/api/v1/community/posts')
      .set('Authorization', `Bearer ${st}`)
      .send({ title: 'Original title here', body: 'Original body of the post for editing.' });
    const postId = post.body.data.item._id;

    const forbiddenEdit = await request(app).patch(`/api/v1/community/posts/${postId}`)
      .set('Authorization', `Bearer ${other}`).send({ body: 'Hijacked body text!' });
    expect(forbiddenEdit.status).toBe(403);

    const edit = await request(app).patch(`/api/v1/community/posts/${postId}`)
      .set('Authorization', `Bearer ${st}`).send({ body: 'Edited body of the post.' });
    expect(edit.status).toBe(200);
    expect(edit.body.data.item.body).toBe('Edited body of the post.');
  });
});

describe('Community: reporting and moderation', () => {
  it('student reports a post; moderator hides it; hidden excluded from feed; restore works', async () => {
    const st = await acceptedStudent();
    const at = await adminToken();
    const post = await request(app).post('/api/v1/community/posts')
      .set('Authorization', `Bearer ${st}`)
      .send({ title: 'Suspicious offer post', body: 'Send me money and I will sell you question papers.' });
    const postId = post.body.data.item._id;

    const report = await request(app).post('/api/v1/community/reports')
      .set('Authorization', `Bearer ${st}`)
      .send({ targetType: 'post', targetId: postId, reason: 'Scam / selling papers' });
    expect(report.status).toBe(201);

    const studentBlocked = await request(app).post(`/api/v1/community/admin/posts/${postId}/moderate`)
      .set('Authorization', `Bearer ${st}`).send({ action: 'hide' });
    expect(studentBlocked.status).toBe(403);

    const hide = await request(app).post(`/api/v1/community/admin/posts/${postId}/moderate`)
      .set('Authorization', `Bearer ${at}`).send({ action: 'hide', reason: 'Violates guidelines' });
    expect(hide.status).toBe(200);
    expect(hide.body.data.status).toBe('hidden');

    const feed = await request(app).get('/api/v1/community/posts').set('Authorization', `Bearer ${st}`);
    expect(feed.body.data.items.length).toBe(0);

    const reports = await request(app).get('/api/v1/community/admin/reports?status=open')
      .set('Authorization', `Bearer ${at}`);
    expect(reports.status).toBe(200);

    const restore = await request(app).post(`/api/v1/community/admin/posts/${postId}/moderate`)
      .set('Authorization', `Bearer ${at}`).send({ action: 'restore' });
    expect(restore.body.data.status).toBe('visible');
  });
});
