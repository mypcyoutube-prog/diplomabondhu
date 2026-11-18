import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import bcrypt from 'bcryptjs';
import { Question } from '../models/question.model';
import { ExamAttempt } from '../models/exam-attempt.model';

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

const ADMIN = '/api/v1/exams/admin';

async function createQuestion(at: string, overrides: Record<string, unknown> = {}, publish = true): Promise<string> {
  const body = {
    text: 'What is 2 + 2?',
    options: [
      { key: 'a', text: '3' },
      { key: 'b', text: '4' },
      { key: 'c', text: '5' }
    ],
    correctKey: 'b',
    explanation: 'Basic arithmetic: 2 + 2 = 4',
    marks: 1,
    ...overrides
  };
  const created = await request(app).post(`${ADMIN}/questions`)
    .set('Authorization', `Bearer ${at}`).send(body);
  expect(created.status).toBe(201);
  const id = created.body.data.item._id as string;
  if (publish) {
    await Question.updateOne({ _id: id }, { $set: { status: 'published' } });
  }
  return id;
}

async function createPublishedExam(at: string, questionIds: string[], overrides: Record<string, unknown> = {}): Promise<string> {
  const created = await request(app).post(`${ADMIN}/exams`)
    .set('Authorization', `Bearer ${at}`)
    .send({
      title: 'Mathematics Model Test 1',
      type: 'model',
      questionIds,
      durationSec: 600,
      marksPerQuestion: 1,
      negativeMarkPercent: 25,
      shuffle: false,
      ...overrides
    });
  expect(created.status).toBe(201);
  const id = created.body.data.item._id as string;
  const published = await request(app).post(`${ADMIN}/exams/${id}/publish`)
    .set('Authorization', `Bearer ${at}`);
  expect(published.status).toBe(200);
  return id;
}

describe('Exam Center: admin question and exam management', () => {
  it('rejects a question whose correctKey is not among option keys', async () => {
    const at = await adminToken();
    const res = await request(app).post(`${ADMIN}/questions`)
      .set('Authorization', `Bearer ${at}`)
      .send({
        text: 'Pick one',
        options: [{ key: 'a', text: '1' }, { key: 'b', text: '2' }],
        correctKey: 'z'
      });
    expect(res.status).toBe(400);
  });

  it('blocks students from admin exam routes', async () => {
    const st = await studentToken();
    const res = await request(app).get(`${ADMIN}/exams`).set('Authorization', `Bearer ${st}`);
    expect(res.status).toBe(403);
  });

  it('refuses to publish an exam with no published questions', async () => {
    const at = await adminToken();
    const qDraft = await createQuestion(at, {}, false);
    const created = await request(app).post(`${ADMIN}/exams`)
      .set('Authorization', `Bearer ${at}`)
      .send({ title: 'Empty Exam', type: 'subject', questionIds: [qDraft], durationSec: 300, marksPerQuestion: 1 });
    const examId = created.body.data.item._id;
    const pub = await request(app).post(`${ADMIN}/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${at}`);
    expect(pub.status).toBe(409);
  });

  it('rejects exams referencing non-existent questions', async () => {
    const at = await adminToken();
    const res = await request(app).post(`${ADMIN}/exams`)
      .set('Authorization', `Bearer ${at}`)
      .send({ title: 'Ghost Exam', type: 'subject', questionIds: ['000000000000000000000000'], durationSec: 300, marksPerQuestion: 1 });
    expect(res.status).toBe(400);
  });
});

describe('Exam Center: attempt lifecycle and server-side scoring', () => {
  async function setupExam(negativePercent = 25) {
    const at = await adminToken();
    const st = await studentToken();
    const q1 = await createQuestion(at, { text: 'What is 2 + 2?', correctKey: 'b' });
    const q2 = await createQuestion(at, { text: 'Capital of Bangladesh?', options: [{ key: 'a', text: 'Dhaka' }, { key: 'b', text: 'Chittagong' }], correctKey: 'a', marks: 2 });
    const examId = await createPublishedExam(at, [q1, q2], { negativeMarkPercent: negativePercent });
    return { at, st, examId, q1, q2 };
  }

  it('never serializes correctKey or explanation before submission', async () => {
    const { st, examId } = await setupExam();
    const detail = await request(app).get(`/api/v1/exams/${examId}`).set('Authorization', `Bearer ${st}`);
    expect(detail.status).toBe(200);
    const raw = JSON.stringify(detail.body);
    expect(raw).not.toContain('correctKey');
    expect(raw).not.toContain('explanation');

    const start = await request(app).post(`/api/v1/exams/${examId}/attempts`).set('Authorization', `Bearer ${st}`);
    expect(start.status).toBe(201);
    const startRaw = JSON.stringify(start.body);
    expect(startRaw).not.toContain('correctKey');
    expect(startRaw).not.toContain('explanation');
    expect(start.body.data.deadlineAt).toBeDefined();
    expect(start.body.data.questions.length).toBe(2);
  });

  it('scores server-side: correct + wrong with negative marking, unanswered = 0', async () => {
    const { st, examId, q1, q2 } = await setupExam(25);

    const start = await request(app).post(`/api/v1/exams/${examId}/attempts`).set('Authorization', `Bearer ${st}`);
    const attemptId = start.body.data.attemptId as string;

    await request(app).patch(`/api/v1/exams/attempts/${attemptId}/answer`)
      .set('Authorization', `Bearer ${st}`).send({ questionId: q1, selectedKey: 'b' });
    await request(app).patch(`/api/v1/exams/attempts/${attemptId}/answer`)
      .set('Authorization', `Bearer ${st}`).send({ questionId: q2, selectedKey: 'b' });

    const submit = await request(app).post(`/api/v1/exams/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${st}`);
    expect(submit.status).toBe(200);
    expect(submit.body.data.scoring.correctCount).toBe(1);
    expect(submit.body.data.scoring.wrongCount).toBe(1);
    expect(submit.body.data.scoring.unansweredCount).toBe(0);
    expect(submit.body.data.scoring.marksObtained).toBe(0.5);
    expect(submit.body.data.scoring.totalMarks).toBe(3);

    const result = await request(app).get(`/api/v1/exams/attempts/${attemptId}/result`)
      .set('Authorization', `Bearer ${st}`);
    expect(result.status).toBe(200);
    expect(result.body.data.scoring.percent).toBeCloseTo(16.67, 1);
    const per = result.body.data.perQuestion as { questionId: string; correctKey: string; explanation?: string }[];
    expect(per.find((p) => p.questionId === q1)?.correctKey).toBe('b');
    expect(per.find((p) => p.questionId === q2)?.explanation).toBeDefined();
  });

  it('submit is idempotent; second submit returns the same score', async () => {
    const { st, examId } = await setupExam(0);
    const start = await request(app).post(`/api/v1/exams/${examId}/attempts`).set('Authorization', `Bearer ${st}`);
    const attemptId = start.body.data.attemptId;
    const first = await request(app).post(`/api/v1/exams/attempts/${attemptId}/submit`).set('Authorization', `Bearer ${st}`);
    const second = await request(app).post(`/api/v1/exams/attempts/${attemptId}/submit`).set('Authorization', `Bearer ${st}`);
    expect(second.status).toBe(200);
    expect(second.body.data.alreadySubmitted).toBe(true);
    expect(second.body.data.scoring).toEqual(first.body.data.scoring);
  });

  it('rejects answers after the server-side deadline', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const q1 = await createQuestion(at);
    const examId = await createPublishedExam(at, [q1], { durationSec: 60 });

    const start = await request(app).post(`/api/v1/exams/${examId}/attempts`).set('Authorization', `Bearer ${st}`);
    const attemptId = start.body.data.attemptId;
    await ExamAttempt.updateOne({ _id: attemptId }, { $set: { deadlineAt: new Date(Date.now() - 1000) } });

    const answer = await request(app).patch(`/api/v1/exams/attempts/${attemptId}/answer`)
      .set('Authorization', `Bearer ${st}`).send({ questionId: q1, selectedKey: 'b' });
    expect(answer.status).toBe(409);
    expect(answer.body.error.message).toContain('deadline');
  });

  it('enforces one active attempt per exam per user (resume, not duplicate)', async () => {
    const { st, examId } = await setupExam();
    const first = await request(app).post(`/api/v1/exams/${examId}/attempts`).set('Authorization', `Bearer ${st}`);
    expect(first.status).toBe(201);
    expect(first.body.data.resumed).toBe(false);
    const second = await request(app).post(`/api/v1/exams/${examId}/attempts`).set('Authorization', `Bearer ${st}`);
    expect(second.status).toBe(200);
    expect(second.body.data.resumed).toBe(true);
    expect(second.body.data.attemptId).toBe(first.body.data.attemptId);
  });

  it('blocks IDOR: another student cannot answer, submit or read result', async () => {
    const { st, examId } = await setupExam();
    const other = await studentToken('other@d.com');
    const start = await request(app).post(`/api/v1/exams/${examId}/attempts`).set('Authorization', `Bearer ${st}`);
    const attemptId = start.body.data.attemptId;

    const answer = await request(app).patch(`/api/v1/exams/attempts/${attemptId}/answer`)
      .set('Authorization', `Bearer ${other}`).send({ questionId: '000000000000000000000001', selectedKey: 'a' });
    expect(answer.status).toBe(404);

    const submit = await request(app).post(`/api/v1/exams/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${other}`);
    expect(submit.status).toBe(404);

    const result = await request(app).get(`/api/v1/exams/attempts/${attemptId}/result`)
      .set('Authorization', `Bearer ${other}`);
    expect(result.status).toBe(404);
  });

  it('rejects answers to questions not in the attempt', async () => {
    const { st, examId } = await setupExam();
    const start = await request(app).post(`/api/v1/exams/${examId}/attempts`).set('Authorization', `Bearer ${st}`);
    const attemptId = start.body.data.attemptId;
    const answer = await request(app).patch(`/api/v1/exams/attempts/${attemptId}/answer`)
      .set('Authorization', `Bearer ${st}`).send({ questionId: '000000000000000000000099', selectedKey: 'a' });
    expect(answer.status).toBe(400);
  });

  it('result requires submission first', async () => {
    const { st, examId } = await setupExam();
    const start = await request(app).post(`/api/v1/exams/${examId}/attempts`).set('Authorization', `Bearer ${st}`);
    const attemptId = start.body.data.attemptId;
    const result = await request(app).get(`/api/v1/exams/attempts/${attemptId}/result`)
      .set('Authorization', `Bearer ${st}`);
    expect(result.status).toBe(409);
  });

  it('history and stats reflect submissions', async () => {
    const { st, examId, q1 } = await setupExam(0);
    const start = await request(app).post(`/api/v1/exams/${examId}/attempts`).set('Authorization', `Bearer ${st}`);
    await request(app).patch(`/api/v1/exams/attempts/${start.body.data.attemptId}/answer`)
      .set('Authorization', `Bearer ${st}`).send({ questionId: q1, selectedKey: 'b' });
    await request(app).post(`/api/v1/exams/attempts/${start.body.data.attemptId}/submit`).set('Authorization', `Bearer ${st}`);

    const history = await request(app).get('/api/v1/exams/history').set('Authorization', `Bearer ${st}`);
    expect(history.body.data.items.length).toBe(1);

    const stats = await request(app).get('/api/v1/exams/stats').set('Authorization', `Bearer ${st}`);
    expect(stats.body.data.attempts).toBe(1);
    expect(stats.body.data.bestPercent).toBeGreaterThan(0);
  });

  it('unpublished exams are invisible to students', async () => {
    const at = await adminToken();
    const st = await studentToken();
    const q1 = await createQuestion(at);
    await request(app).post(`${ADMIN}/exams`)
      .set('Authorization', `Bearer ${at}`)
      .send({ title: 'Draft Exam', type: 'subject', questionIds: [q1], durationSec: 300, marksPerQuestion: 1 });
    const list = await request(app).get('/api/v1/exams').set('Authorization', `Bearer ${st}`);
    expect(list.body.data.items.length).toBe(0);
  });
});
