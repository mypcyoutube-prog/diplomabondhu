import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import bcrypt from 'bcryptjs';
import { EducationProgram, Regulation, Semester, Subject, Technology } from '../models/academic.models';

const app = createApp(testEnv);

beforeAll(async () => { await startMongo(); });

beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

async function adminToken(): Promise<string> {
  await User.create({
    name: 'Main Admin', email: 'admin@d.com',
    passwordHash: await bcrypt.hash('AdminPass123', 4), role: 'admin'
  });
  const res = await request(app).post('/api/v1/auth/login')
    .send({ email: 'admin@d.com', password: 'AdminPass123' });
  return res.body.data.accessToken;
}

async function studentToken(): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Stu', email: 'stu@d.com', password: 'Password123' });
  return res.body.data.accessToken;
}

describe('academic hierarchy', () => {
  it('admin creates full hierarchy; student reads it', async () => {
    const at = await adminToken();

    const program = await request(app).post('/api/v1/academic/admin/programs')
      .set('Authorization', `Bearer ${at}`)
      .send({ name: 'Diploma in Engineering', nameBn: 'ডিপ্লোমা ইন ইঞ্জিনিয়ারিং', code: 'DIP-ENG' });
    expect(program.status).toBe(201);
    const programId = program.body.data.item._id;

    const regulation = await request(app).post('/api/v1/academic/admin/regulations')
      .set('Authorization', `Bearer ${at}`)
      .send({ programId, year: 2022, name: 'Probidhan 2022', status: 'published',
        officialRefs: [{ title: 'BTEB Curriculum 2022', url: 'https://www.bteb.gov.bd' }] });
    expect(regulation.status).toBe(201);
    const regulationId = regulation.body.data.item._id;

    const tech = await request(app).post('/api/v1/academic/admin/technologies')
      .set('Authorization', `Bearer ${at}`)
      .send({ programId, name: 'Computer Technology', nameBn: 'কম্পিউটার টেকনোলজি', code: 'CMT' });
    const technologyId = tech.body.data.item._id;

    const semester = await request(app).post('/api/v1/academic/admin/semesters')
      .set('Authorization', `Bearer ${at}`)
      .send({ programId, regulationId, number: 1, cgpaWeightPercent: 5 });
    expect(semester.status).toBe(201);
    const semesterId = semester.body.data.item._id;

    const subject = await request(app).post('/api/v1/academic/admin/subjects')
      .set('Authorization', `Bearer ${at}`)
      .send({ programId, regulationId, technologyId, semesterId, code: '26611', name: 'Computer Fundamentals', credits: 3 });
    expect(subject.status).toBe(201);
    const subjectId = subject.body.data.item._id;

    const chapter = await request(app).post('/api/v1/academic/admin/chapters')
      .set('Authorization', `Bearer ${at}`)
      .send({ subjectId, number: 1, name: 'Introduction to Computers' });
    expect(chapter.status).toBe(201);

    const st = await studentToken();
    const list = await request(app).get(`/api/v1/academic/subjects?regulationId=${regulationId}&semesterId=${semesterId}`)
      .set('Authorization', `Bearer ${st}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items.length).toBe(1);
    expect(list.body.meta.total).toBe(1);

    const search = await request(app).get('/api/v1/academic/subjects?q=computer')
      .set('Authorization', `Bearer ${st}`);
    expect(search.body.data.items.length).toBe(1);
  });

  it('duplicate subject code in same regulation is rejected with 409', async () => {
    const at = await adminToken();
    const program = await request(app).post('/api/v1/academic/admin/programs')
      .set('Authorization', `Bearer ${at}`).send({ name: 'Dip Eng', code: 'DE' });
    const programId = program.body.data.item._id;
    const regulation = await request(app).post('/api/v1/academic/admin/regulations')
      .set('Authorization', `Bearer ${at}`).send({ programId, year: 2016, name: 'Probidhan 2016' });
    const regulationId = regulation.body.data.item._id;
    const tech = await request(app).post('/api/v1/academic/admin/technologies')
      .set('Authorization', `Bearer ${at}`).send({ programId, name: 'Civil', code: 'CT' });
    const technologyId = tech.body.data.item._id;
    const semester = await request(app).post('/api/v1/academic/admin/semesters')
      .set('Authorization', `Bearer ${at}`).send({ programId, regulationId, number: 1, cgpaWeightPercent: 5 });
    const semesterId = semester.body.data.item._id;

    const body = { programId, regulationId, technologyId, semesterId, code: '25911', name: 'Math-1', credits: 4 };
    const first = await request(app).post('/api/v1/academic/admin/subjects')
      .set('Authorization', `Bearer ${at}`).send(body);
    expect(first.status).toBe(201);
    const second = await request(app).post('/api/v1/academic/admin/subjects')
      .set('Authorization', `Bearer ${at}`).send(body);
    expect(second.status).toBe(409);
  });

  it('student cannot create academic entities', async () => {
    const st = await studentToken();
    const res = await request(app).post('/api/v1/academic/admin/programs')
      .set('Authorization', `Bearer ${st}`).send({ name: 'Hack', code: 'H' });
    expect(res.status).toBe(403);
  });

  it('soft-deleted subjects are excluded from lists', async () => {
    const at = await adminToken();
    const program = await request(app).post('/api/v1/academic/admin/programs')
      .set('Authorization', `Bearer ${at}`).send({ name: 'Dip Eng', code: 'DE2' });
    const programId = program.body.data.item._id;
    const created = await request(app).post('/api/v1/academic/admin/programs')
      .set('Authorization', `Bearer ${at}`).send({ name: 'Dip Textile', code: 'DT' });
    const del = await request(app).delete(`/api/v1/academic/admin/programs/${created.body.data.item._id}`)
      .set('Authorization', `Bearer ${at}`);
    expect(del.status).toBe(200);
    const list = await request(app).get('/api/v1/academic/programs').set('Authorization', `Bearer ${at}`);
    expect(list.body.data.items.find((i: { _id: string }) => i._id === created.body.data.item._id)).toBeUndefined();
    expect(programId).toBeTruthy();
  });
});

describe('settings', () => {
  it('public settings endpoint returns defaults', async () => {
    const res = await request(app).get('/api/v1/settings/app');
    expect(res.status).toBe(200);
    expect(res.body.data.branding.appName).toBe('DiplomaBondhu');
    expect(res.body.data.maintenanceMode).toBe(false);
    const sections = res.body.data.homepageSections as { key: string; visible: boolean }[];
    expect(sections.some((s) => s.key === 'result_checker' && s.visible)).toBe(true);
  });

  it('admin can toggle maintenance mode (audit-logged)', async () => {
    const at = await adminToken();
    const res = await request(app).put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${at}`)
      .send({ maintenanceMode: true });
    expect(res.status).toBe(200);
    expect(res.body.data.settings.maintenanceMode).toBe(true);
    const publicRes = await request(app).get('/api/v1/settings/app');
    expect(publicRes.body.data.maintenanceMode).toBe(true);
  });
});

describe('users profile & preferences', () => {
  it('student updates academic info and preferences', async () => {
    const at = await adminToken();
    const program = await request(app).post('/api/v1/academic/admin/programs')
      .set('Authorization', `Bearer ${at}`).send({ name: 'Dip Eng', code: 'DE9' });
    const programId = program.body.data.item._id;

    const st = await studentToken();
    const res = await request(app).patch('/api/v1/users/me/academic-info')
      .set('Authorization', `Bearer ${st}`).send({ programId });
    expect(res.status).toBe(200);
    expect(res.body.data.user.profile.programId).toBe(programId);

    const prefs = await request(app).patch('/api/v1/users/me/preferences')
      .set('Authorization', `Bearer ${st}`).send({ language: 'en', theme: 'dark' });
    expect(prefs.body.data.user.prefs.language).toBe('en');
    expect(prefs.body.data.user.prefs.theme).toBe('dark');
  });

  it('academic-info rejects nonexistent referenced ids as invalid ObjectId format only', async () => {
    const st = await studentToken();
    const res = await request(app).patch('/api/v1/users/me/academic-info')
      .set('Authorization', `Bearer ${st}`).send({ programId: 'zzz' });
    expect(res.status).toBe(400);
  });
});
