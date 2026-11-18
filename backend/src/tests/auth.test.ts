import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import { RefreshToken } from '../models/refresh-token.model';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });

beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

const validRegistration = { name: 'Rahim Uddin', email: 'rahim@example.com', password: 'StrongPass123' };

describe('POST /api/v1/auth/register', () => {
  it('registers a student and returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validRegistration);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('student');
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(setCookie.join()).toContain('refreshToken');
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);
    const res = await request(app).post('/api/v1/auth/register').send(validRegistration);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects weak password with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ ...validRegistration, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid email with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ ...validRegistration, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('never allows role escalation via registration body', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ ...validRegistration, role: 'admin' });
    expect(res.status).toBe(201);
    const user = await User.findOne({ email: validRegistration.email });
    expect(user?.role).toBe('student');
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: validRegistration.email, password: validRegistration.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(validRegistration.email);
  });

  it('rejects wrong password with 401 and identical message', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: validRegistration.email, password: 'WrongPassword1' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('rejects unknown email with identical message (no user enumeration)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'ghost@example.com', password: 'Whatever123' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });
});

describe('refresh token rotation', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);
  });

  it('rotates refresh token and issues new access token', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Asha', email: 'a@b.com', password: 'Password123' });
    const cookie = reg.headers['set-cookie'];
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    const oldToken = (cookie[0].match(/refreshToken=([^;]+)/) ?? [])[1];
    const stored = await RefreshToken.findOne({ revokedAt: { $ne: null } });
    expect(stored).toBeTruthy();
    expect(oldToken).toBeTruthy();
  });

  it('rejects a reused (already rotated) refresh token', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Asha', email: 'reuse@b.com', password: 'Password123' });
    const cookie = reg.headers['set-cookie'];
    await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).send({});
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).send({});
    expect(res.status).toBe(401);
    const user = await User.findOne({ email: 'reuse@b.com' });
    const sessions = await RefreshToken.find({ userId: user!._id, revokedAt: null });
    expect(sessions.length).toBe(0);
  });

  it('rejects refresh without token with 400', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
  });
});

describe('protected routes and session management', () => {
  it('GET /auth/me requires authentication', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns current user with valid token', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validRegistration);
    const token = reg.body.data.accessToken;
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validRegistration.email);
  });

  it('rejects tampered JWT', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validRegistration);
    const token: string = reg.body.data.accessToken;
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token.slice(0, -3)}abc`);
    expect(res.status).toBe(401);
  });

  it('change-password revokes all sessions', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validRegistration);
    const token = reg.body.data.accessToken;
    const res = await request(app).post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: validRegistration.password, newPassword: 'NewPassword123' });
    expect(res.status).toBe(200);
    const active = await RefreshToken.find({ revokedAt: null });
    expect(active.length).toBe(0);
  });

  it('logout revokes refresh token', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validRegistration);
    const cookie = reg.headers['set-cookie'];
    const res = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie).send({});
    expect(res.status).toBe(200);
    const active = await RefreshToken.find({ revokedAt: null });
    expect(active.length).toBe(0);
  });
});
