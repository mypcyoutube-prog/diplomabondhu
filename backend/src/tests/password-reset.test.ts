import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import { RefreshToken } from '../models/refresh-token.model';
import { PasswordReset } from '../models/password-reset.model';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });

beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

async function registerStudent(email = 's@example.com') {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Student', email, password: 'Password123' });
  return res.body.data;
}

async function createAdminToken() {
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

describe('Password reset flow', () => {
  it('forgot-password always returns 202 (no user enumeration)', async () => {
    await registerStudent();
    const known = await request(app).post('/api/v1/auth/forgot-password').send({ email: 's@example.com' });
    const unknown = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'ghost@example.com' });
    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body.data.accepted).toBe(true);
    expect(unknown.body.data.accepted).toBe(true);
    const tokens = await PasswordReset.find().lean();
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).not.toHaveProperty('resetToken');
  });

  it('forgot-password does not create a second active token within 10 minutes', async () => {
    await registerStudent();
    await request(app).post('/api/v1/auth/forgot-password').send({ email: 's@example.com' });
    await request(app).post('/api/v1/auth/forgot-password').send({ email: 's@example.com' });
    const tokens = await PasswordReset.find().lean();
    expect(tokens).toHaveLength(1);
  });

  it('admin issues one-time reset code; old pending tokens are invalidated', async () => {
    const { user } = await registerStudent();
    await request(app).post('/api/v1/auth/forgot-password').send({ email: 's@example.com' });
    const adminToken = await createAdminToken();
    const res = await request(app).post(`/api/v1/admin/students/${user.id}/password-reset`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.resetToken).toBeTruthy();
    expect(res.body.data.expiresInMinutes).toBe(30);
    const pending = await PasswordReset.find({ usedAt: { $exists: false } }).lean();
    expect(pending).toHaveLength(1);
  });

  it('student cannot issue reset codes; anonymous blocked', async () => {
    const { accessToken } = await registerStudent();
    const adminToken = await createAdminToken();
    const list = await request(app).get('/api/v1/admin/students').set('Authorization', `Bearer ${adminToken}`);
    const studentId = list.body.data.items[0]._id;
    const forbidden = await request(app).post(`/api/v1/admin/students/${studentId}/password-reset`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(forbidden.status).toBe(403);
    const anonymous = await request(app).post(`/api/v1/admin/students/${studentId}/password-reset`);
    expect(anonymous.status).toBe(401);
  });

  it('full flow: forgot -> admin code -> reset -> login with new password, old sessions revoked', async () => {
    const { user, refreshToken } = await registerStudent();
    await request(app).post('/api/v1/auth/forgot-password').send({ email: 's@example.com' });
    const adminToken = await createAdminToken();
    const issued = await request(app).post(`/api/v1/admin/students/${user.id}/password-reset`)
      .set('Authorization', `Bearer ${adminToken}`);
    const resetToken = issued.body.data.resetToken as string;

    const badToken = await request(app).post('/api/v1/auth/reset-password')
      .send({ token: 'x'.repeat(43), newPassword: 'NewPassword123' });
    expect(badToken.status).toBe(400);

    const reset = await request(app).post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: 'NewPassword123' });
    expect(reset.status).toBe(200);

    const reuse = await request(app).post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: 'OtherPassword123' });
    expect(reuse.status).toBe(400);

    const sessions = await RefreshToken.find({ userId: user.id }).lean();
    expect(sessions.every((s) => s.revokedAt)).toBe(true);

    const oldLogin = await request(app).post('/api/v1/auth/login')
      .send({ email: 's@example.com', password: 'Password123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post('/api/v1/auth/login')
      .send({ email: 's@example.com', password: 'NewPassword123' });
    expect(newLogin.status).toBe(200);
  });

  it('reset rejects weak passwords and malformed tokens', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password')
      .send({ token: 'short', newPassword: 'NewPassword123' });
    expect(res.status).toBe(400);
    const res2 = await request(app).post('/api/v1/auth/reset-password')
      .send({ token: 'x'.repeat(43), newPassword: 'short' });
    expect(res2.status).toBe(400);
  });
});
