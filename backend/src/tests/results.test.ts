import http from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import { AuditLog } from '../models/audit-log.model';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import type { Env } from '../config/env';

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');

let pythonServer: http.Server;
let pythonUrl = '';
let pythonCalls: Array<{ method: string; url: string; auth: string | undefined }> = [];

beforeAll(async () => {
  await startMongo();
  pythonServer = http.createServer((req, res) => {
    pythonCalls.push({ method: req.method ?? '', url: req.url ?? '', auth: req.headers.authorization });
    res.setHeader('content-type', 'application/json');
    if (req.method === 'POST' && req.url === '/parse') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        if (!body.includes('%PDF')) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ detail: 'Not a PDF file' }));
        }
        res.end(JSON.stringify({
          batchId: 'a'.repeat(24), fileName: 'sample.pdf', pagesScanned: 2,
          recordCount: 4, warnings: [], sample: [{ roll: '410123', gpa: 3.75, status: 'pass' }]
        }));
      });
      return;
    }
    if (req.method === 'POST' && req.url === `/import/${'a'.repeat(24)}`) {
      return res.end(JSON.stringify({ batchId: 'a'.repeat(24), examId: 'eng-3rd-2026-11', total: 4, inserted: 4, updated: 0 }));
    }
    if (req.method === 'POST' && req.url === '/parse/drive/job') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        let payload: { apiKey?: string } = {};
        try { payload = JSON.parse(body); } catch { payload = {}; }
        if (!payload.apiKey) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ detail: 'Google Drive API key is not set' }));
        }
        if (!payload.apiKey.startsWith('AIza')) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ detail: 'Google Drive API rejected the request: API key not valid' }));
        }
        res.end(JSON.stringify({ jobId: 'd'.repeat(24) }));
      });
      return;
    }
    if (req.method === 'GET' && req.url === `/parse/job/${'d'.repeat(24)}`) {
      return res.end(JSON.stringify({ stage: 'parsing', fileName: 'drive-folder (2 PDFs)', log: ['— file 1/2: RESULT_7th.pdf —', 'downloaded RESULT_7th.pdf (4096 bytes)'] }));
    }
    if (req.method === 'GET' && req.url === '/batches') {
      return res.end(JSON.stringify({ batches: [{ batchId: 'a'.repeat(24), fileName: 'sample.pdf', examId: null, recordCount: 4 }] }));
    }
    if (req.method === 'POST' && req.url === '/parse/job') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        if (!body.includes('%PDF')) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ detail: 'Not a PDF file' }));
        }
        res.end(JSON.stringify({ jobId: 'b'.repeat(24) }));
      });
      return;
    }
    if (req.method === 'POST' && req.url === '/parse/url/job') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        let payload: { url?: string; examId?: string; title?: string } = {};
        try { payload = JSON.parse(body); } catch { payload = {}; }
        if (!payload.url || payload.url.startsWith('http') === false) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ detail: 'A PDF URL is required' }));
        }
        res.end(JSON.stringify({ jobId: 'c'.repeat(24), url: payload.url, examId: payload.examId ?? '' }));
      });
      return;
    }
    if (req.method === 'GET' && req.url === `/parse/job/${'c'.repeat(24)}`) {
      return res.end(JSON.stringify({ stage: 'downloading', fileName: 'sheet.pdf', log: ['[19:00:00] downloading …', '[19:00:01] downloaded sheet.pdf (1048576 bytes)'] }));
    }
    if (req.method === 'GET' && req.url === `/parse/job/${'b'.repeat(24)}`) {
      return res.end(JSON.stringify({ stage: 'parsing', pagesDone: 120, pages: 1103, fileName: 'sample.pdf' }));
    }
    if (req.method === 'GET' && req.url === `/import/${'a'.repeat(24)}/progress`) {
      return res.end(JSON.stringify({ stage: 'importing', total: 4, done: 2 }));
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ detail: 'Not found' }));
  });
  await new Promise<void>((resolve) => pythonServer.listen(0, '127.0.0.1', resolve));
  const addr = pythonServer.address();
  pythonUrl = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => pythonServer.close(() => resolve()));
  await stopMongo();
});

beforeEach(async () => {
  await clearDb();
  pythonCalls = [];
  await mongoose.connection.useDb('results_db').dropDatabase();
  await AuditLog.deleteMany({});
});

function envWith(overrides: Partial<Env> = {}): Env {
  return { ...testEnv, ...overrides };
}

async function adminToken(env: Env): Promise<string> {
  const existing = await User.findOne({ email: 'admin@d.com' });
  if (!existing) {
    await User.create({
      name: 'Main Admin', email: 'admin@d.com',
      passwordHash: await bcrypt.hash('AdminPass123', 4), role: 'admin'
    });
  }
  const res = await request(createApp(env)).post('/api/v1/auth/login')
    .send({ email: 'admin@d.com', password: 'AdminPass123' });
  return res.body.data.accessToken;
}

async function studentToken(env: Env): Promise<string> {
  const res = await request(createApp(env)).post('/api/v1/auth/register')
    .send({ name: 'Student One', email: 'stu@d.com', password: 'Password123' });
  return res.body.data.accessToken;
}

const ADMIN = '/api/v1/results/admin';

describe('results admin proxy', () => {
  it('returns 503 when result service is not configured', async () => {
    const token = await adminToken(envWith());
    const res = await request(createApp(envWith())).post(`${ADMIN}/parse`)
      .set('Authorization', `Bearer ${token}`).attach('file', PDF, 'sample.pdf');
    expect(res.status).toBe(503);
  });

  it('proxies PDF parse to python service and returns preview', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await adminToken(env);
    const res = await request(createApp(env)).post(`${ADMIN}/parse`)
      .set('Authorization', `Bearer ${token}`).attach('file', PDF, 'sample.pdf');
    expect(res.status).toBe(200);
    expect(res.body.batchId).toBe('a'.repeat(24));
    expect(res.body.recordCount).toBe(4);
    expect(pythonCalls[0].auth).toBe('Bearer svc-token');
  });

  it('rejects non-multipart parse requests', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await adminToken(env);
    const res = await request(createApp(env)).post(`${ADMIN}/parse`)
      .set('Authorization', `Bearer ${token}`).set('content-type', 'application/json').send({});
    expect(res.status).toBe(400);
  });

  it('starts a parse job and polls its live progress', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await adminToken(env);
    const start = await request(createApp(env)).post(`${ADMIN}/parse-job`)
      .set('Authorization', `Bearer ${token}`).attach('file', PDF, 'sample.pdf');
    expect(start.status).toBe(200);
    expect(start.body.jobId).toBe('b'.repeat(24));
    const poll = await request(createApp(env)).get(`${ADMIN}/parse-job/${'b'.repeat(24)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(poll.status).toBe(200);
    expect(poll.body.stage).toBe('parsing');
    expect(poll.body.pagesDone).toBe(120);
    expect(poll.body.pages).toBe(1103);
  });

  it('rejects malformed parse-job ids', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await adminToken(env);
    const res = await request(createApp(env)).get(`${ADMIN}/parse-job/not-a-job`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('starts a parse-from-url job through the proxy', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await adminToken(env);
    const res = await request(createApp(env)).post(`${ADMIN}/parse-url`)
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/results/RESULT_7th.pdf', examId: 'eng-7th-2022reg-2026' });
    expect(res.status).toBe(200);
    expect(res.body.jobId).toBe('c'.repeat(24));
    expect(pythonCalls.some((c) => c.url === '/parse/url/job')).toBe(true);
  });

  it('validates parse-url body (no url / non-http scheme)', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await adminToken(env);
    const missing = await request(createApp(env)).post(`${ADMIN}/parse-url`)
      .set('Authorization', `Bearer ${token}`).send({});
    expect(missing.status).toBe(400);
    const ftp = await request(createApp(env)).post(`${ADMIN}/parse-url`)
      .set('Authorization', `Bearer ${token}`).send({ url: 'ftp://example.com/x.pdf' });
    expect(ftp.status).toBe(400);
  });

  it('drive-key lifecycle: not configured -> set (masked, never returned raw) -> configured', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await adminToken(env);
    const initial = await request(createApp(env)).get(`${ADMIN}/drive-key`)
      .set('Authorization', `Bearer ${token}`);
    expect(initial.status).toBe(200);
    expect(initial.body.data.configured).toBe(false);

    const saved = await request(createApp(env)).put(`${ADMIN}/drive-key`)
      .set('Authorization', `Bearer ${token}`).send({ apiKey: 'AIzaSyExampleKey1234567890abcd' });
    expect(saved.status).toBe(200);
    expect(saved.body.data.configured).toBe(true);
    expect(saved.body.data.keyMasked).toContain('…');
    expect(JSON.stringify(saved.body)).not.toContain('AIzaSyExampleKey1234567890abcd');

    const after = await request(createApp(env)).get(`${ADMIN}/drive-key`)
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.data.configured).toBe(true);
    expect(JSON.stringify(after.body)).not.toContain('AIzaSyExampleKey1234567890abcd');
  });

  it('blocks parse-drive when no drive key is set', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await adminToken(env);
    const res = await request(createApp(env)).post(`${ADMIN}/parse-drive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ folderUrl: 'https://drive.google.com/drive/folders/1AbC_dEf-1234567890' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Drive API key');
  });

  it('starts a drive-folder parse job with the saved key', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token', GOOGLE_DRIVE_API_KEY: 'AIzaSyExampleKey1234567890abcd' });
    const token = await adminToken(env);
    const res = await request(createApp(env)).post(`${ADMIN}/parse-drive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ folderUrl: 'https://drive.google.com/drive/folders/1AbC_dEf-1234567890' });
    expect(res.status).toBe(200);
    expect(res.body.jobId).toBe('d'.repeat(24));
    const poll = await request(createApp(env)).get(`${ADMIN}/parse-job/${'d'.repeat(24)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(poll.status).toBe(200);
    expect(poll.body.stage).toBe('parsing');
    expect(poll.body.log?.length).toBeGreaterThan(0);
  });

  it('polls a parse-from-url job with the download log', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await adminToken(env);
    const res = await request(createApp(env)).get(`${ADMIN}/parse-job/${'c'.repeat(24)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.stage).toBe('downloading');
    expect(res.body.log).toHaveLength(2);
  });

  it('polls import progress through the proxy', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await adminToken(env);
    const res = await request(createApp(env)).get(`${ADMIN}/import-progress/${'a'.repeat(24)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.stage).toBe('importing');
    expect(res.body.done).toBe(2);
  });

  it('proxies import and writes an audit log entry', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await adminToken(env);
    const res = await request(createApp(env)).post(`${ADMIN}/import`)
      .set('Authorization', `Bearer ${token}`)
      .send({ batchId: 'a'.repeat(24), examId: 'eng-3rd-2026-11', title: 'Diploma in Engineering 3rd Semester Nov 2026' });
    expect(res.status).toBe(200);
    expect(res.body.inserted).toBe(4);
    const audit = await AuditLog.findOne({ action: 'results.import' });
    expect(audit?.targetId).toBe('eng-3rd-2026-11');
  });

  it('blocks students from admin proxy routes', async () => {
    const env = envWith({ RESULT_SERVICE_URL: pythonUrl, RESULT_SERVICE_TOKEN: 'svc-token' });
    const token = await studentToken(env);
    const res = await request(createApp(env)).get(`${ADMIN}/batches`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('student result endpoints', () => {
  const app = createApp(testEnv);

  async function seedResult() {
    const db = mongoose.connection.useDb('results_db');
    await db.collection('records').insertOne({
      examId: 'eng-3rd-2026-11', roll: '410123', name: 'Student One',
      registrationNo: '1040123456', gpa: 3.75, status: 'pass', subjects: []
    });
    await db.collection('exams').insertOne({
      examId: 'eng-3rd-2026-11', recordCount: 1, title: 'Diploma in Engineering 3rd Semester', updatedAt: '2026-11-17T00:00:00Z'
    });
  }

  it('requires authentication for meta and check', async () => {
    expect((await request(app).get('/api/v1/results/meta')).status).toBe(401);
    expect((await request(app).get('/api/v1/results/check?examId=x&roll=410123')).status).toBe(401);
  });

  it('requires authentication for admin proxy routes', async () => {
    expect((await request(app).get(`${ADMIN}/parse-job/${'b'.repeat(24)}`)).status).toBe(401);
    expect((await request(app).get(`${ADMIN}/import-progress/${'a'.repeat(24)}`)).status).toBe(401);
  });

  it('lists exams via meta', async () => {
    await seedResult();
    const token = await studentToken(testEnv);
    const res = await request(app).get('/api/v1/results/meta').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.exams[0].examId).toBe('eng-3rd-2026-11');
    expect(res.body.data.exams[0].recordCount).toBe(1);
  });

  it('returns a matched result with disclaimer', async () => {
    await seedResult();
    const token = await studentToken(testEnv);
    const res = await request(app).get('/api/v1/results/check?examId=eng-3rd-2026-11&roll=410123')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.roll).toBe('410123');
    expect(res.body.data.gpa).toBe(3.75);
    expect(res.body.data.disclaimer).toContain('not an official BTEB service');
  });

  it('returns 404 for unknown roll and 400 for malformed roll', async () => {
    await seedResult();
    const token = await studentToken(testEnv);
    const miss = await request(app).get('/api/v1/results/check?examId=eng-3rd-2026-11&roll=999999')
      .set('Authorization', `Bearer ${token}`);
    expect(miss.status).toBe(404);
    const bad = await request(app).get('/api/v1/results/check?examId=eng-3rd-2026-11&roll=abc')
      .set('Authorization', `Bearer ${token}`);
    expect(bad.status).toBe(400);
  });

  it('verifies registrationNo: matching passes, mismatch returns 404, absent stays optional', async () => {
    await seedResult();
    const token = await studentToken(testEnv);
    const ok = await request(app)
      .get('/api/v1/results/check?examId=eng-3rd-2026-11&roll=410123&registrationNo=1040123456')
      .set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    const mismatch = await request(app)
      .get('/api/v1/results/check?examId=eng-3rd-2026-11&roll=410123&registrationNo=9999999999')
      .set('Authorization', `Bearer ${token}`);
    expect(mismatch.status).toBe(404);
  });

  it('history returns all exams for a roll, newest semester first, with titles', async () => {
    const db = mongoose.connection.useDb('results_db');
    await db.collection('records').insertMany([
      {
        examId: 'eng-5th-2026-11', roll: '410123', name: 'Student One',
        gpa: 3.60, status: 'pass', subjects: [{ code: '28553', type: 'T' }],
        institute: 'Himaloy Polytechnic Institute', semesterGpas: { gpa1: 3.36, gpa5: 3.60 }, examSemester: 5,
        meta: {}
      },
      {
        examId: 'eng-3rd-2026-11', roll: '410123', name: 'Student One',
        gpa: 3.75, status: 'pass', subjects: [],
        institute: 'Himaloy Polytechnic Institute', semesterGpas: { gpa1: 3.36, gpa3: 3.75 }, examSemester: 3,
        meta: {}
      }
    ]);
    await db.collection('exams').insertMany([
      { examId: 'eng-3rd-2026-11', recordCount: 1, title: 'Diploma in Engineering 3rd Semester', checkCount: 0 },
      { examId: 'eng-5th-2026-11', recordCount: 1, title: 'Diploma in Engineering 5th Semester', checkCount: 0 }
    ]);
    const token = await studentToken(testEnv);
    const res = await request(app).get('/api/v1/results/history?roll=410123')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.records).toHaveLength(2);
    expect(res.body.data.records[0].examSemester).toBe(5);
    expect(res.body.data.records[0].title).toBe('Diploma in Engineering 5th Semester');
    expect(res.body.data.records[1].examSemester).toBe(3);
    expect(res.body.data.records[0].subjects[0].type).toBe('T');
    expect(res.body.data.records[0].disclaimer).toContain('not an official BTEB service');
  });

  it('history returns 404 when the roll has no published results', async () => {
    const token = await studentToken(testEnv);
    const res = await request(app).get('/api/v1/results/history?roll=410123')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('history requires authentication and rejects malformed rolls', async () => {
    expect((await request(app).get('/api/v1/results/history?roll=410123')).status).toBe(401);
    const token = await studentToken(testEnv);
    expect((await request(app).get('/api/v1/results/history?roll=abc').set('Authorization', `Bearer ${token}`)).status).toBe(400);
  });
});
