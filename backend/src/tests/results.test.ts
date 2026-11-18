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
    if (req.method === 'GET' && req.url === '/batches') {
      return res.end(JSON.stringify({ batches: [{ batchId: 'a'.repeat(24), fileName: 'sample.pdf', examId: null, recordCount: 4 }] }));
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
});
