import request from 'supertest';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { setAiProviderForTests, type AiProvider } from '../core/ai';
import { StudyPlan } from '../models/study-plan.model';

const app = createApp(testEnv);

const PLAN_JSON = JSON.stringify({
  days: [
    { label: 'Day 1', focus: 'Higher Math', tasks: [{ title: 'Chapter 3 revision', minutes: 60 }] },
    { label: 'Day 2', focus: 'Physics', tasks: [{ title: 'Numerical practice', minutes: 45 }] }
  ]
});

const mockProvider: AiProvider = {
  configured: true,
  name: 'mock:test',
  generate: async () => ({ text: PLAN_JSON, tokensUsed: 150 })
};

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); setAiProviderForTests(mockProvider); });
afterAll(async () => { await stopMongo(); setAiProviderForTests(undefined); });

async function studentToken(email = 'ai@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'AI Student', email, password: 'Password123' });
  return res.body.data.accessToken;
}

describe('AI status and configuration', () => {
  it('reports unconfigured provider without a key', async () => {
    setAiProviderForTests(undefined);
    const st = await studentToken();
    const res = await request(app).get('/api/v1/ai/status').set('Authorization', `Bearer ${st}`);
    expect(res.status).toBe(200);
    expect(res.body.data.configured).toBe(false);
  });
});

describe('AI study plan generator', () => {
  it('generates an editable, estimated plan via the AI provider', async () => {
    const st = await studentToken();
    const gen = await request(app).post('/api/v1/ai/study-plan/generate')
      .set('Authorization', `Bearer ${st}`)
      .send({ subjects: ['Higher Math', 'Physics'], availableHoursPerDay: 3, goal: 'Final exam', days: 2 });
    expect(gen.status).toBe(201);
    expect(gen.body.data.estimated).toBe(true);
    const planId = String(gen.body.data.item._id);
    expect(gen.body.data.item.plan.days).toHaveLength(2);

    const edited = await request(app).put(`/api/v1/ai/study-plan/${planId}`)
      .set('Authorization', `Bearer ${st}`)
      .send({ plan: { days: [{ label: 'Day 1', focus: 'Custom', tasks: [{ title: 'Custom task', minutes: 30 }] }] }, status: 'saved' });
    expect(edited.status).toBe(200);
    expect(edited.body.data.item.plan.days[0].focus).toBe('Custom');
  });

  it('applies a plan into planner tasks only after explicit action', async () => {
    const st = await studentToken();
    const gen = await request(app).post('/api/v1/ai/study-plan/generate')
      .set('Authorization', `Bearer ${st}`)
      .send({ subjects: ['Math'], availableHoursPerDay: 2, days: 1 });
    const planId = String(gen.body.data.item._id);

    const apply = await request(app).post(`/api/v1/ai/study-plan/${planId}/apply`).set('Authorization', `Bearer ${st}`);
    expect(apply.status).toBe(201);
    expect(apply.body.data.createdTasks).toBe(2);
    expect(apply.body.data.estimated).toBe(true);

    const tasks = await request(app).get('/api/v1/planner/tasks').set('Authorization', `Bearer ${st}`);
    const titles = tasks.body.data.items.map((t: { title: string }) => t.title);
    expect(titles).toContain('Chapter 3 revision');
  });

  it('enforces the daily plan limit and 503s when AI is not configured', async () => {
    const st = await studentToken();
    for (let i = 0; i < testEnv.AI_PLAN_DAILY_LIMIT; i++) {
      await request(app).post('/api/v1/ai/study-plan/generate')
        .set('Authorization', `Bearer ${st}`)
        .send({ subjects: ['Math'], availableHoursPerDay: 2, days: 1 });
    }
    const blocked = await request(app).post('/api/v1/ai/study-plan/generate')
      .set('Authorization', `Bearer ${st}`)
      .send({ subjects: ['Math'], availableHoursPerDay: 2, days: 1 });
    expect(blocked.status).toBe(429);

    setAiProviderForTests(undefined);
    const other = await studentToken('ai2@d.com');
    const unconfigured = await request(app).post('/api/v1/ai/study-plan/generate')
      .set('Authorization', `Bearer ${other}`)
      .send({ subjects: ['Math'], availableHoursPerDay: 2, days: 1 });
    expect(unconfigured.status).toBe(503);
    expect(unconfigured.body.success).toBe(false);
  });

  it('keeps plans private between users', async () => {
    const a = await studentToken('ai-a@d.com');
    const b = await studentToken('ai-b@d.com');
    const gen = await request(app).post('/api/v1/ai/study-plan/generate')
      .set('Authorization', `Bearer ${a}`)
      .send({ subjects: ['Math'], availableHoursPerDay: 2, days: 1 });
    const planId = String(gen.body.data.item._id);
    const foreign = await request(app).put(`/api/v1/ai/study-plan/${planId}`)
      .set('Authorization', `Bearer ${b}`)
      .send({ plan: { days: [] } });
    expect(foreign.status).toBe(404);
    await request(app).post(`/api/v1/ai/study-plan/${planId}/apply`).set('Authorization', `Bearer ${b}`);
    const bTasks = await request(app).get('/api/v1/planner/tasks').set('Authorization', `Bearer ${b}`);
    expect(bTasks.body.data.items).toHaveLength(0);
  });
});
