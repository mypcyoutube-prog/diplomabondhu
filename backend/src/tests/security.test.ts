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

async function registerStudent() {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Student', email: 's@example.com', password: 'Password123' });
  return res.body.data.accessToken as string;
}

async function createAdmin() {
  await User.create({
    name: 'Main Admin',
    email: 'admin@diplomabondhu.com',
    passwordHash: await bcrypt.hash('AdminPass123', 4),
    role: 'admin'
  });
  const res = await request(app).post('/api/v1/auth/login')
    .send({ email: 'admin@diplomabondhu.com', password: 'AdminPass123' });
  return res.body.data.accessToken as string;
}

describe('RBAC', () => {
  it('student cannot access /admin/* routes', async () => {
    const token = await registerStudent();
    const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('anonymous cannot access /admin/* routes', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('admin can access dashboard', async () => {
    const token = await createAdmin();
    const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.students).toBeDefined();
  });

  it('student cannot update settings', async () => {
    const token = await registerStudent();
    const res = await request(app).put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ maintenanceMode: false });
    expect(res.status).toBe(403);
  });
});

describe('input validation & NoSQL injection protection', () => {
  it('strips $ operators from login body (NoSQL injection attempt)', async () => {
    await request(app).post('/api/v1/auth/register')
      .send({ name: 'S', email: 'inject@example.com', password: 'Password123' });
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: 'inject@example.com', password: { $ne: null } as unknown as string });
    expect([400, 401]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid ObjectId params with 400/404', async () => {
    const token = await registerStudent();
    const res = await request(app).get('/api/v1/academic/programs/not-an-id').set('Authorization', `Bearer ${token}`);
    expect([400, 404]).toContain(res.status);
  });

  it('rejects unknown fields in profile update (strict schema)', async () => {
    const token = await registerStudent();
    const res = await request(app).patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(400);
  });

  it('student cannot change own role through academic-info endpoint', async () => {
    const token = await registerStudent();
    const res = await request(app).patch('/api/v1/users/me/academic-info')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(400);
    const user = await User.findOne({ email: 's@example.com' });
    expect(user?.role).toBe('student');
  });
});

describe('suspended accounts', () => {
  it('suspended student cannot log in', async () => {
    await request(app).post('/api/v1/auth/register')
      .send({ name: 'Bad', email: 'bad@example.com', password: 'Password123' });
    await User.updateOne({ email: 'bad@example.com' }, { $set: { status: 'suspended' } });
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: 'bad@example.com', password: 'Password123' });
    expect(res.status).toBe(401);
  });
});

describe('admin student management with audit', () => {
  it('suspend then reactivate writes audit entries', async () => {
    const adminToken = await createAdmin();
    await request(app).post('/api/v1/auth/register')
      .send({ name: 'Target', email: 'target@example.com', password: 'Password123' });
    const student = await User.findOne({ email: 'target@example.com' });
    const suspend = await request(app).post(`/api/v1/admin/students/${student!._id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'community guideline violation' });
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.status).toBe('suspended');
    const reactivate = await request(app).post(`/api/v1/admin/students/${student!._id}/reactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reactivate.body.data.status).toBe('active');
    const logs = await request(app).get('/api/v1/admin/audit-logs?action=student.')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logs.status).toBe(200);
    expect(logs.body.data.items.length).toBeGreaterThanOrEqual(2);
  });

  it('suspend requires a reason', async () => {
    const adminToken = await createAdmin();
    const student = await User.create({ name: 'X', email: 'x@example.com', passwordHash: 'x'.repeat(20), role: 'student' });
    const res = await request(app).post(`/api/v1/admin/students/${student._id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
