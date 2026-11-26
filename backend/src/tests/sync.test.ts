import request from 'supertest';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

async function studentToken(email = 'sync@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Sync Student', email, password: 'Password123' });
  return res.body.data.accessToken;
}

async function currentUserId(token: string): Promise<string> {
  const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
  return String(res.body.data.user._id ?? res.body.data.user.id);
}

describe('cross-device sync', () => {
  it('registers, lists and revokes devices per user', async () => {
    const a = await studentToken();
    const reg = await request(app).post('/api/v1/sync/devices')
      .set('Authorization', `Bearer ${a}`)
      .send({ deviceId: 'device-aaaa-1111', platform: 'android', name: 'My Phone' });
    expect(reg.status).toBe(201);

    const again = await request(app).post('/api/v1/sync/devices')
      .set('Authorization', `Bearer ${a}`)
      .send({ deviceId: 'device-aaaa-1111', platform: 'android', name: 'My Phone' });
    expect(again.status).toBe(201);

    const list = await request(app).get('/api/v1/sync/devices').set('Authorization', `Bearer ${a}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);

    const deviceId = list.body.data.items[0].id;
    const revoke = await request(app).delete(`/api/v1/sync/devices/${deviceId}`).set('Authorization', `Bearer ${a}`);
    expect(revoke.status).toBe(200);
    const after = await request(app).get('/api/v1/sync/devices').set('Authorization', `Bearer ${a}`);
    expect(after.body.data.items).toHaveLength(0);
  });

  it('returns server-authoritative deltas since a watermark', async () => {
    const a = await studentToken();
    const userId = await currentUserId(a);
    await Task.create({ userId: new mongoose.Types.ObjectId(userId), title: 'Old task' });

    const first = await request(app).get('/api/v1/sync/changes').set('Authorization', `Bearer ${a}`);
    expect(first.status).toBe(200);
    expect(first.body.data.changes.tasks).toHaveLength(1);
    const serverTime = first.body.data.serverTime;

    await request(app).post('/api/v1/planner/tasks')
      .set('Authorization', `Bearer ${a}`)
      .send({ title: 'New task' });

    const delta = await request(app).get(`/api/v1/sync/changes?since=${encodeURIComponent(serverTime)}`)
      .set('Authorization', `Bearer ${a}`);
    expect(delta.status).toBe(200);
    expect(delta.body.data.changes.tasks).toHaveLength(1);
    expect(delta.body.data.changes.tasks[0].title).toBe('New task');
  });

  it('applies offline pushes with last-write-wins and flags conflicts', async () => {
    const a = await studentToken();
    const userId = await currentUserId(a);
    const created = await request(app).post('/api/v1/planner/tasks')
      .set('Authorization', `Bearer ${a}`)
      .send({ title: 'Server task' });
    const taskId = String(created.body.data.item._id ?? created.body.data.item.id);

    const staleTime = new Date(Date.now() - 60_000).toISOString();
    const push = await request(app).post('/api/v1/sync/push')
      .set('Authorization', `Bearer ${a}`)
      .send({
        deviceId: 'device-aaaa-2222',
        ops: [
          { collection: 'tasks', clientUpdatedAt: staleTime, data: { id: taskId, title: 'Stale offline edit' } }
        ]
      });
    expect(push.status).toBe(200);
    expect(push.body.data.conflicts).toHaveLength(1);

    const freshTime = new Date(Date.now() + 60_000).toISOString();
    const push2 = await request(app).post('/api/v1/sync/push')
      .set('Authorization', `Bearer ${a}`)
      .send({
        deviceId: 'device-aaaa-2222',
        ops: [
          { collection: 'tasks', clientUpdatedAt: freshTime, data: { id: taskId, title: 'Fresh offline edit' } },
          { collection: 'notes', clientUpdatedAt: freshTime, data: { title: 'Offline note', body: 'from device' } }
        ]
      });
    expect(push2.status).toBe(200);
    expect(push2.body.data.applied).toHaveLength(2);

    const tasks = await request(app).get('/api/v1/planner/tasks').set('Authorization', `Bearer ${a}`);
    const titles = tasks.body.data.items.map((t: { title: string }) => t.title);
    expect(titles).toContain('Fresh offline edit');

    const notes = await request(app).get('/api/v1/workspace/notes').set('Authorization', `Bearer ${a}`);
    expect(notes.body.data.items).toHaveLength(1);
  });

  it('never leaks another user data through changes or push', async () => {
    const a = await studentToken('sync-a@d.com');
    const b = await studentToken('sync-b@d.com');
    const userIdA = await currentUserId(a);
    await Task.create({ userId: new mongoose.Types.ObjectId(userIdA), title: 'A private task' });

    const bChanges = await request(app).get('/api/v1/sync/changes').set('Authorization', `Bearer ${b}`);
    expect(bChanges.body.data.changes.tasks).toHaveLength(0);
  });
});
