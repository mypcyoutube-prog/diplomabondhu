import request from 'supertest';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import { AppSettings } from '../models/app-settings.model';
import { DEFAULT_HOMEPAGE_SECTIONS } from '../modules/settings/settings.routes';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

async function studentToken(email = 'pref@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Pref Student', email, password: 'Password123' });
  return res.body.data.accessToken;
}

async function adminToken(): Promise<string> {
  await User.create({
    name: 'Main Admin', email: 'admin-pref@d.com',
    passwordHash: await bcrypt.hash('AdminPass123', 4), role: 'admin'
  });
  const res = await request(app).post('/api/v1/auth/login')
    .send({ email: 'admin-pref@d.com', password: 'AdminPass123' });
  return res.body.data.accessToken;
}

describe('dashboard preferences', () => {
  it('returns admin defaults when the student has not customized', async () => {
    await AppSettings.create({ homepageSections: DEFAULT_HOMEPAGE_SECTIONS });
    const st = await studentToken();
    const res = await request(app).get('/api/v1/me/dashboard-preferences').set('Authorization', `Bearer ${st}`);
    expect(res.status).toBe(200);
    expect(res.body.data.customized).toBe(false);
    const keys = res.body.data.sections.map((s: { key: string }) => s.key);
    expect(keys).toContain('materials');
    expect(keys).toContain('gpa_calculator');
    for (const s of res.body.data.sections) expect(s.visible).toBe(true);
  });

  it('saves per-student section order and visibility, isolated per user', async () => {
    await AppSettings.create({ homepageSections: DEFAULT_HOMEPAGE_SECTIONS });
    const st = await studentToken();
    const save = await request(app).put('/api/v1/me/dashboard-preferences')
      .set('Authorization', `Bearer ${st}`)
      .send({ sections: [{ key: 'materials', visible: false, order: 5 }, { key: 'exams', visible: true, order: 1 }] });
    expect(save.status).toBe(200);
    expect(save.body.data.customized).toBe(true);
    expect(save.body.data.sections[0].key).toBe('exams');
    expect(save.body.data.sections.find((s: { key: string }) => s.key === 'materials').visible).toBe(false);

    const other = await studentToken('other-pref@d.com');
    const otherRes = await request(app).get('/api/v1/me/dashboard-preferences').set('Authorization', `Bearer ${other}`);
    expect(otherRes.body.data.customized).toBe(false);
  });

  it('rejects admin-disabled sections and non-customizable hiding, and resets', async () => {
    const sections = DEFAULT_HOMEPAGE_SECTIONS.map((s) =>
      s.key === 'community' ? { ...s, visible: false } : s.key === 'announcements' ? { ...s, customizable: false } : s
    );
    await AppSettings.create({ homepageSections: sections });
    const st = await studentToken();

    const hiddenDisabled = await request(app).put('/api/v1/me/dashboard-preferences')
      .set('Authorization', `Bearer ${st}`)
      .send({ sections: [{ key: 'community', visible: true, order: 1 }] });
    expect(hiddenDisabled.status).toBe(400);

    const hideLocked = await request(app).put('/api/v1/me/dashboard-preferences')
      .set('Authorization', `Bearer ${st}`)
      .send({ sections: [{ key: 'announcements', visible: false, order: 1 }] });
    expect(hideLocked.status).toBe(400);

    const reset = await request(app).post('/api/v1/me/dashboard-preferences/reset').set('Authorization', `Bearer ${st}`);
    expect(reset.status).toBe(200);
    expect(reset.body.data.customized).toBe(false);
  });

  it('blocks anonymous access and students cannot use search admin endpoints', async () => {
    const anon = await request(app).get('/api/v1/me/dashboard-preferences');
    expect(anon.status).toBe(401);

    const st = await studentToken();
    const adminAnalytics = await request(app).get('/api/v1/search/admin/analytics').set('Authorization', `Bearer ${st}`);
    expect(adminAnalytics.status).toBe(403);
  });
});
