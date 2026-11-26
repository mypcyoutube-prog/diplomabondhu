import request from 'supertest';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import { StudyMaterial } from '../models/study-material.model';
import { BtebSubject } from '../models/bteb-subject.model';
import { AppSettings } from '../models/app-settings.model';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

async function studentToken(email = 'ssearch@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Search Student', email, password: 'Password123' });
  return res.body.data.accessToken;
}

async function adminToken(): Promise<string> {
  await User.create({
    name: 'Main Admin', email: 'admin-ssearch@d.com',
    passwordHash: await bcrypt.hash('AdminPass123', 4), role: 'admin'
  });
  const res = await request(app).post('/api/v1/auth/login')
    .send({ email: 'admin-ssearch@d.com', password: 'AdminPass123' });
  return res.body.data.accessToken;
}

describe('smart search: subject scope, suggestions and history', () => {
  it('searches BTEB subjects as a new scope', async () => {
    await BtebSubject.create({ technology: 'Computer', technologySlug: 'cse', regulation: 2016, semester: 3, code: '66253', name: 'Digital Electronics' });
    await StudyMaterial.create({ type: 'book', title: 'Electronics Guide', status: 'published' });

    const res = await request(app).get('/api/v1/search?q=electronics&type=subject');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].code).toBe('66253');

    const grouped = await request(app).get('/api/v1/search?q=electronics');
    expect(grouped.body.data.types.subject.count).toBe(1);
    expect(grouped.body.data.types.material.count).toBe(1);
  });

  it('expands queries with admin-managed synonyms', async () => {
    await AppSettings.create({ searchSynonyms: [['result', 'gpa']] });
    await StudyMaterial.create({ type: 'note', title: 'GPA calculation guide', status: 'published' });

    const res = await request(app).get('/api/v1/search?q=result');
    expect(res.status).toBe(200);
    expect(res.body.data.types.material.count).toBe(1);
  });

  it('records history for authenticated users only and returns suggestions', async () => {
    const st = await studentToken();
    await request(app).get('/api/v1/search?q=electronics').set('Authorization', `Bearer ${st}`);
    await request(app).get('/api/v1/search?q=chemistry').set('Authorization', `Bearer ${st}`);

    const history = await request(app).get('/api/v1/search/history').set('Authorization', `Bearer ${st}`);
    expect(history.status).toBe(200);
    expect(history.body.data.items.map((i: { q: string }) => i.q).sort()).toEqual(['chemistry', 'electronics']);

    const suggest = await request(app).get('/api/v1/search/suggest?q=elec').set('Authorization', `Bearer ${st}`);
    expect(suggest.status).toBe(200);
    expect(suggest.body.data.suggestions).toContain('electronics');

    const clear = await request(app).delete('/api/v1/search/history').set('Authorization', `Bearer ${st}`);
    expect(clear.status).toBe(200);
    const empty = await request(app).get('/api/v1/search/history').set('Authorization', `Bearer ${st}`);
    expect(empty.body.data.items).toHaveLength(0);
  });

  it('requires authentication for suggest and history', async () => {
    expect((await request(app).get('/api/v1/search/suggest?q=abc')).status).toBe(401);
    expect((await request(app).get('/api/v1/search/history')).status).toBe(401);
  });

  it('serves admin analytics for top and zero-result queries', async () => {
    const st = await studentToken();
    await request(app).get('/api/v1/search?q=electronics').set('Authorization', `Bearer ${st}`);
    await request(app).get('/api/v1/search?q=xyzzy-nonexistent').set('Authorization', `Bearer ${st}`);

    const admin = await adminToken();
    const res = await request(app).get('/api/v1/search/admin/analytics').set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    const qs = res.body.data.topQueries.map((t: { q: string }) => t.q);
    expect(qs).toContain('electronics');
    expect(res.body.data.zeroResultQueries).toContain('xyzzy-nonexistent');

    const config = await request(app).put('/api/v1/search/admin/config')
      .set('Authorization', `Bearer ${admin}`)
      .send({ groups: [['exam', 'test']] });
    expect(config.status).toBe(200);
    expect(config.body.data.groups).toEqual([['exam', 'test']]);

    const studentBlocked = await request(app).put('/api/v1/search/admin/config')
      .set('Authorization', `Bearer ${st}`)
      .send({ groups: [] });
    expect(studentBlocked.status).toBe(403);
  });
});
