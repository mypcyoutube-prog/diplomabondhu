import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import bcrypt from 'bcryptjs';
import type { CalculationProfileData } from '../modules/gpa/gpa.engine';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

const profileData2016: CalculationProfileData = {
  grading: {
    scale: 4,
    table: [
      { minPercent: 80, maxPercent: 100, grade: 'A+', point: 4.0 },
      { minPercent: 75, maxPercent: 79.99, grade: 'A', point: 3.75 },
      { minPercent: 70, maxPercent: 74.99, grade: 'A-', point: 3.5 },
      { minPercent: 65, maxPercent: 69.99, grade: 'B+', point: 3.25 },
      { minPercent: 60, maxPercent: 64.99, grade: 'B', point: 3.0 },
      { minPercent: 55, maxPercent: 59.99, grade: 'B-', point: 2.75 },
      { minPercent: 50, maxPercent: 54.99, grade: 'C+', point: 2.5 },
      { minPercent: 45, maxPercent: 49.99, grade: 'C', point: 2.25 },
      { minPercent: 40, maxPercent: 44.99, grade: 'D', point: 2.0 },
      { minPercent: 0, maxPercent: 39.99, grade: 'F', point: 0 }
    ]
  },
  assessments: {
    theory: [
      { key: 'ca', label: 'Continuous Assessment', maxMarks: 30, weightPercent: 30 },
      { key: 'final', label: 'Final Examination', maxMarks: 70, weightPercent: 70 }
    ]
  },
  passRules: { minSubjectGrade: 'D' },
  cgpa: {
    strategy: 'semester_weighted',
    semesterWeights: [
      { semesterNumber: 1, percent: 5 },
      { semesterNumber: 2, percent: 5 },
      { semesterNumber: 3, percent: 5 },
      { semesterNumber: 4, percent: 10 },
      { semesterNumber: 5, percent: 15 },
      { semesterNumber: 6, percent: 20 },
      { semesterNumber: 7, percent: 25 },
      { semesterNumber: 8, percent: 15 }
    ],
    classBands: [{ minCgpa: 3.0, label: 'First Class' }, { minCgpa: 2.0, label: 'Pass' }]
  },
  special: { allowIncompleteProvisional: true }
};

async function adminToken(): Promise<string> {
  const existing = await User.findOne({ email: 'admin@d.com' });
  if (!existing) {
    await User.create({
      name: 'Main Admin', email: 'admin@d.com',
      passwordHash: await bcrypt.hash('AdminPass123', 4), role: 'admin'
    });
  }
  const res = await request(app).post('/api/v1/auth/login')
    .send({ email: 'admin@d.com', password: 'AdminPass123' });
  return res.body.data.accessToken;
}

async function studentToken(email = 'stu@d.com'): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Student One', email, password: 'Password123' });
  return res.body.data.accessToken;
}

async function createRegulation(): Promise<string> {
  const at = await adminToken();
  const program = await request(app).post('/api/v1/academic/admin/programs')
    .set('Authorization', `Bearer ${at}`)
    .send({ name: 'Diploma in Engineering', nameBn: 'ডিপ্লোমা ইন ইঞ্জিনিয়ারিং', code: 'DIP-ENG' });
  const regulation = await request(app).post('/api/v1/academic/admin/regulations')
    .set('Authorization', `Bearer ${at}`)
    .send({ programId: program.body.data.item._id, year: 2016, name: 'Probidhan 2016', status: 'published',
      officialRefs: [{ title: 'BTEB Curriculum 2016', url: 'https://www.bteb.gov.bd' }] });
  return regulation.body.data.item._id;
}

const ADMIN_GPA = '/api/v1/gpa/admin';

describe('GPA API: admin profile lifecycle', () => {
  it('blocks students from all admin GPA routes', async () => {
    const st = await studentToken();
    const res = await request(app).get(`${ADMIN_GPA}/profiles`).set('Authorization', `Bearer ${st}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('creates a draft profile and walks Draft -> Verification -> Testing -> Approved -> Published', async () => {
    const at = await adminToken();
    const regulationId = await createRegulation();

    const created = await request(app).post(`${ADMIN_GPA}/profiles`)
      .set('Authorization', `Bearer ${at}`)
      .send({ regulationId, data: profileData2016 });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('draft');
    const profileId = created.body.data.id;

    const draftDetail = await request(app).get(`${ADMIN_GPA}/profiles/${profileId}`).set('Authorization', `Bearer ${at}`);
    expect(draftDetail.status).toBe(200);
    expect(draftDetail.body.data.profile.status).toBe('draft');

    const noRefs = await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'verification' });
    expect(noRefs.status).toBe(400);

    const addRefs = await request(app).put(`${ADMIN_GPA}/profiles/${profileId}`)
      .set('Authorization', `Bearer ${at}`)
      .send({ verification: { sourceRefs: [{ title: 'BTEB Curriculum 2016 (provisional - pending owner verification)', url: 'https://www.bteb.gov.bd' }] } });
    expect(addRefs.status).toBe(200);

    const withRefs = await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`)
      .send({ to: 'verification', note: 'Provisional - third-party sources pending owner verification' });
    expect(withRefs.status).toBe(200);
    expect(withRefs.body.data.status).toBe('verification');

    const toTesting = await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'testing' });
    expect(toTesting.status).toBe(200);

    const publishWithoutTestRun = await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'published' });
    expect(publishWithoutTestRun.status).toBe(409);

    const testRun = await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/test-run`)
      .set('Authorization', `Bearer ${at}`);
    expect(testRun.status).toBe(200);
    expect(testRun.body.data.passed).toBe(true);

    const toApproved = await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'approved' });
    expect(toApproved.status).toBe(200);

    const published = await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'published' });
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe('published');
  });

  it('rejects illegal transitions (draft -> published)', async () => {
    const at = await adminToken();
    const regulationId = await createRegulation();
    const created = await request(app).post(`${ADMIN_GPA}/profiles`)
      .set('Authorization', `Bearer ${at}`)
      .send({ regulationId, data: profileData2016, verification: { sourceRefs: [{ title: 'BTEB 2016 curriculum' }] } });
    const profileId = created.body.data.id;

    const skip = await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'published' });
    expect(skip.status).toBe(409);
    expect(skip.body.error.code).toBe('CONFLICT');
  });

  it('rejects publishing when the test suite fails', async () => {
    const at = await adminToken();
    const regulationId = await createRegulation();
    const brokenData: CalculationProfileData = {
      ...profileData2016,
      cgpa: { ...profileData2016.cgpa, semesterWeights: profileData2016.cgpa.semesterWeights.map((w) => ({ ...w, percent: 10 })) }
    };
    const created = await request(app).post(`${ADMIN_GPA}/profiles`)
      .set('Authorization', `Bearer ${at}`)
      .send({ regulationId, data: brokenData, verification: { sourceRefs: [{ title: 'BTEB 2016 curriculum' }] } });
    const profileId = created.body.data.id;

    await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'verification' });
    await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'testing' });

    const testRun = await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/test-run`)
      .set('Authorization', `Bearer ${at}`);
    expect(testRun.body.data.passed).toBe(false);

    await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'approved' });

    const publish = await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'published' });
    expect(publish.status).toBe(409);
    expect(publish.body.error.message).toContain('test suite');
  });
});

describe('GPA API: student calculation endpoints', () => {
  async function publishedProfileId(): Promise<{ profileId: string; st: string }> {
    const at = await adminToken();
    const regulationId = await createRegulation();
    const created = await request(app).post(`${ADMIN_GPA}/profiles`)
      .set('Authorization', `Bearer ${at}`)
      .send({ regulationId, data: profileData2016, verification: { sourceRefs: [{ title: 'BTEB 2016 curriculum' }] } });
    const profileId = created.body.data.id;
    for (const to of ['verification', 'testing']) {
      await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
        .set('Authorization', `Bearer ${at}`).send({ to });
    }
    await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/test-run`).set('Authorization', `Bearer ${at}`);
    await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'approved' });
    await request(app).post(`${ADMIN_GPA}/profiles/${profileId}/transition`)
      .set('Authorization', `Bearer ${at}`).send({ to: 'published' });
    const st = await studentToken();
    return { profileId, st };
  }

  it('returns 404 for unpublished profiles on student endpoints', async () => {
    const at = await adminToken();
    const regulationId = await createRegulation();
    const created = await request(app).post(`${ADMIN_GPA}/profiles`)
      .set('Authorization', `Bearer ${at}`)
      .send({ regulationId, data: profileData2016 });
    const draftId = created.body.data.id;
    const st = await studentToken();

    const structure = await request(app).get(`/api/v1/gpa/profiles/${draftId}/structure`)
      .set('Authorization', `Bearer ${st}`);
    expect(structure.status).toBe(404);

    const calc = await request(app).post('/api/v1/gpa/calculate/cgpa')
      .set('Authorization', `Bearer ${st}`)
      .send({
        profileId: draftId,
        semesterGpas: [{ semesterNumber: 1, gpa: 4.0 }]
      });
    expect(calc.status).toBe(404);
  });

  it('calculates CGPA and returns a class band on full completion', async () => {
    const { profileId, st } = await publishedProfileId();
    const res = await request(app).post('/api/v1/gpa/calculate/cgpa')
      .set('Authorization', `Bearer ${st}`)
      .send({
        profileId,
        semesterGpas: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ semesterNumber: n, gpa: 4.0 }))
      });
    expect(res.status).toBe(200);
    expect(res.body.data.cgpa).toBe(4.0);
    expect(res.body.data.classBand).toBe('First Class');
  });

  it('saves, lists, reads and deletes own results; blocks IDOR across students', async () => {
    const { profileId, st } = await publishedProfileId();

    const saved = await request(app).post('/api/v1/gpa/results')
      .set('Authorization', `Bearer ${st}`)
      .send({
        kind: 'cgpa', profileId,
        inputs: { semesterGpas: [{ semesterNumber: 1, gpa: 4.0 }] },
        output: { cgpa: 4.0 },
        label: 'CGPA (provisional)'
      });
    expect(saved.status).toBe(201);
    const resultId = saved.body.data.id;

    const list = await request(app).get('/api/v1/gpa/results').set('Authorization', `Bearer ${st}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items.length).toBe(1);

    const other = await studentToken('other@d.com');
    const idor = await request(app).get(`/api/v1/gpa/results/${resultId}`)
      .set('Authorization', `Bearer ${other}`);
    expect(idor.status).toBe(404);

    const del = await request(app).delete(`/api/v1/gpa/results/${resultId}`)
      .set('Authorization', `Bearer ${other}`);
    expect(del.status).toBe(404);

    const ownDel = await request(app).delete(`/api/v1/gpa/results/${resultId}`)
      .set('Authorization', `Bearer ${st}`);
    expect(ownDel.status).toBe(200);

    const afterDelete = await request(app).get('/api/v1/gpa/results').set('Authorization', `Bearer ${st}`);
    expect(afterDelete.body.data.items.length).toBe(0);
  });

  it('lists only published profiles for students', async () => {
    const at = await adminToken();
    const regulationId = await createRegulation();
    await request(app).post(`${ADMIN_GPA}/profiles`)
      .set('Authorization', `Bearer ${at}`)
      .send({ regulationId, data: profileData2016 });
    const st = await studentToken();

    const list = await request(app).get('/api/v1/gpa/profiles').set('Authorization', `Bearer ${st}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items.length).toBe(0);
  });
});
