import request from 'supertest';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { WorkspaceNote } from '../models/workspace-note.model';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import bcrypt from 'bcryptjs';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

async function studentToken(email = 'exp@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Export Student', email, password: 'Password123' });
  return res.body.data.accessToken;
}

async function currentUserId(token: string): Promise<string> {
  const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
  return String(res.body.data.user._id ?? res.body.data.user.id);
}

describe('student data export', () => {
  it('exports selected datasets as JSON with correct ownership data', async () => {
    const st = await studentToken();
    const userId = await currentUserId(st);
    await WorkspaceNote.create({ userId: new mongoose.Types.ObjectId(userId), title: 'My note', body: 'note body' });
    await Task.create({ userId: new mongoose.Types.ObjectId(userId), title: 'My task' });

    const job = await request(app).post('/api/v1/export/jobs')
      .set('Authorization', `Bearer ${st}`)
      .send({ datasets: ['notes', 'tasks'], format: 'json' });
    expect(job.status).toBe(201);
    expect(job.body.data.item.status).toBe('ready');
    const jobId = job.body.data.item.id;

    const download = await request(app).get(`/api/v1/export/jobs/${jobId}/download`).set('Authorization', `Bearer ${st}`);
    expect(download.status).toBe(200);
    const payload = JSON.parse(download.text);
    expect(payload.notes).toHaveLength(1);
    expect(payload.notes[0].title).toBe('My note');
    expect(payload.tasks[0].title).toBe('My task');

    const history = await request(app).get('/api/v1/export/jobs').set('Authorization', `Bearer ${st}`);
    expect(history.body.data.items).toHaveLength(1);
    expect(history.body.data.items[0].content).toBeUndefined();
  });

  it('exports CSV format and rejects invalid datasets', async () => {
    const st = await studentToken();
    const job = await request(app).post('/api/v1/export/jobs')
      .set('Authorization', `Bearer ${st}`)
      .send({ datasets: ['tasks'], format: 'csv' });
    expect(job.status).toBe(201);
    const jobId = job.body.data.item.id;

    const download = await request(app).get(`/api/v1/export/jobs/${jobId}/download`).set('Authorization', `Bearer ${st}`);
    expect(download.headers['content-type']).toContain('text/csv');

    const bad = await request(app).post('/api/v1/export/jobs')
      .set('Authorization', `Bearer ${st}`)
      .send({ datasets: ['other-students-data'], format: 'json' });
    expect(bad.status).toBe(400);
  });

  it('blocks foreign download access and requires authentication', async () => {
    const st = await studentToken();
    const other = await studentToken('exp2@d.com');
    const job = await request(app).post('/api/v1/export/jobs')
      .set('Authorization', `Bearer ${st}`)
      .send({ datasets: ['notes'], format: 'json' });
    const jobId = job.body.data.item.id;

    const foreign = await request(app).get(`/api/v1/export/jobs/${jobId}/download`).set('Authorization', `Bearer ${other}`);
    expect(foreign.status).toBe(404);

    const anon = await request(app).get('/api/v1/export/jobs');
    expect(anon.status).toBe(401);
  });

  it('marks expired exports as expired and refuses download', async () => {
    const st = await studentToken();
    const userId = await currentUserId(st);
    const job = await request(app).post('/api/v1/export/jobs')
      .set('Authorization', `Bearer ${st}`)
      .send({ datasets: ['notes'], format: 'json' });
    const jobId = job.body.data.item.id;

    await ExportJob.updateOne({ _id: new mongoose.Types.ObjectId(jobId) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const download = await request(app).get(`/api/v1/export/jobs/${jobId}/download`).set('Authorization', `Bearer ${st}`);
    expect(download.status).toBe(410);
  });
});

import { ExportJob } from '../models/export-job.model';
void User; void bcrypt;
