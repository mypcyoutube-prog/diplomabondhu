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

async function studentToken(email = 'stu@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Student One', email, password: 'Password123' });
  return res.body.data.accessToken;
}

describe('Planner: routine', () => {
  it('returns empty routine initially and saves/replaces slots', async () => {
    const st = await studentToken();
    const empty = await request(app).get('/api/v1/planner/routine').set('Authorization', `Bearer ${st}`);
    expect(empty.status).toBe(200);
    expect(empty.body.data.routine.slots).toEqual([]);

    const save = await request(app).put('/api/v1/planner/routine')
      .set('Authorization', `Bearer ${st}`)
      .send({ slots: [{ day: 0, start: '09:00', end: '10:30', title: 'Math Class', kind: 'class', room: '401' }] });
    expect(save.status).toBe(200);
    expect(save.body.data.routine.slots.length).toBe(1);

    const replace = await request(app).put('/api/v1/planner/routine')
      .set('Authorization', `Bearer ${st}`)
      .send({ slots: [] });
    expect(replace.body.data.routine.slots.length).toBe(0);
  });

  it('rejects invalid time format and keeps routines isolated per user', async () => {
    const st = await studentToken();
    const bad = await request(app).put('/api/v1/planner/routine')
      .set('Authorization', `Bearer ${st}`)
      .send({ slots: [{ day: 0, start: '9am', end: '10:00', title: 'Bad' }] });
    expect(bad.status).toBe(400);

    const other = await studentToken('other@d.com');
    const otherRoutine = await request(app).get('/api/v1/planner/routine').set('Authorization', `Bearer ${other}`);
    expect(otherRoutine.body.data.routine.slots).toEqual([]);
  });
});

describe('Planner: tasks and goals', () => {
  it('creates, lists by date, updates status, and soft-deletes tasks', async () => {
    const st = await studentToken();
    const created = await request(app).post('/api/v1/planner/tasks')
      .set('Authorization', `Bearer ${st}`)
      .send({ title: 'Finish Chapter 3', dueAt: '2030-05-10', reminderAt: '2030-05-09T18:00:00Z' });
    expect(created.status).toBe(201);
    const taskId = created.body.data.item._id;

    const byDate = await request(app).get('/api/v1/planner/tasks?date=2030-05-10').set('Authorization', `Bearer ${st}`);
    expect(byDate.body.data.items.length).toBe(1);

    const wrongDate = await request(app).get('/api/v1/planner/tasks?date=2030-05-11').set('Authorization', `Bearer ${st}`);
    expect(wrongDate.body.data.items.length).toBe(0);

    const done = await request(app).patch(`/api/v1/planner/tasks/${taskId}`)
      .set('Authorization', `Bearer ${st}`).send({ status: 'done' });
    expect(done.body.data.item.status).toBe('done');

    const todoList = await request(app).get('/api/v1/planner/tasks?status=todo').set('Authorization', `Bearer ${st}`);
    expect(todoList.body.data.items.length).toBe(0);

    const del = await request(app).delete(`/api/v1/planner/tasks/${taskId}`).set('Authorization', `Bearer ${st}`);
    expect(del.status).toBe(200);
    const after = await request(app).get('/api/v1/planner/tasks').set('Authorization', `Bearer ${st}`);
    expect(after.body.data.items.length).toBe(0);
  });

  it('blocks IDOR on tasks (other student cannot patch/delete)', async () => {
    const st = await studentToken();
    const other = await studentToken('other@d.com');
    const created = await request(app).post('/api/v1/planner/tasks')
      .set('Authorization', `Bearer ${st}`).send({ title: 'Secret Task' });
    const taskId = created.body.data.item._id;

    const patch = await request(app).patch(`/api/v1/planner/tasks/${taskId}`)
      .set('Authorization', `Bearer ${other}`).send({ status: 'done' });
    expect(patch.status).toBe(404);

    const del = await request(app).delete(`/api/v1/planner/tasks/${taskId}`)
      .set('Authorization', `Bearer ${other}`);
    expect(del.status).toBe(404);
  });

  it('goals: create, progress to 100 auto-achieves, list, delete', async () => {
    const st = await studentToken();
    const created = await request(app).post('/api/v1/planner/goals')
      .set('Authorization', `Bearer ${st}`)
      .send({ title: 'Complete GPA 3.5 this semester', targetDate: '2030-08-01' });
    expect(created.status).toBe(201);
    const goalId = created.body.data.item._id;

    const half = await request(app).patch(`/api/v1/planner/goals/${goalId}`)
      .set('Authorization', `Bearer ${st}`).send({ progressPercent: 50 });
    expect(half.body.data.item.status).toBe('active');

    const full = await request(app).patch(`/api/v1/planner/goals/${goalId}`)
      .set('Authorization', `Bearer ${st}`).send({ progressPercent: 100 });
    expect(full.body.data.item.status).toBe('achieved');

    const list = await request(app).get('/api/v1/planner/goals').set('Authorization', `Bearer ${st}`);
    expect(list.body.data.items.length).toBe(1);

    await request(app).delete(`/api/v1/planner/goals/${goalId}`).set('Authorization', `Bearer ${st}`);
    const after = await request(app).get('/api/v1/planner/goals').set('Authorization', `Bearer ${st}`);
    expect(after.body.data.items.length).toBe(0);
  });

  it('calendar returns tasks of the requested month only', async () => {
    const st = await studentToken();
    await request(app).post('/api/v1/planner/tasks')
      .set('Authorization', `Bearer ${st}`)
      .send({ title: 'In month', dueAt: '2030-05-10' });
    await request(app).post('/api/v1/planner/tasks')
      .set('Authorization', `Bearer ${st}`)
      .send({ title: 'Out of month', dueAt: '2030-06-10' });

    const cal = await request(app).get('/api/v1/planner/calendar?month=2030-05').set('Authorization', `Bearer ${st}`);
    expect(cal.status).toBe(200);
    expect(cal.body.data.tasks.length).toBe(1);
    expect(cal.body.data.tasks[0].title).toBe('In month');

    const bad = await request(app).get('/api/v1/planner/calendar?month=2030-13').set('Authorization', `Bearer ${st}`);
    expect(bad.status).toBe(400);
  });
});
