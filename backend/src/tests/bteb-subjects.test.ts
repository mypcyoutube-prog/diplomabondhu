import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { clearDb, startMongo, stopMongo, testEnv } from './setup';
import { User } from '../models/user.model';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { BtebSubject } from '../models/bteb-subject.model';

const app = createApp(testEnv);
const BtebSubjectCollection = BtebSubject;

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    slug: 'computer-technology', name: 'Computer Technology',
    semesters: [{
      semester: 5,
      group: null,
      subjects: [{
        code: '28553', name: 'Computer Architecture & Microprocessor',
        credit: 4, theoryMaxMarks: 150, practicalMaxMarks: 50,
        ppwTheory: 3, ppwPractical: 2, type: 'theory_practical'
      }, ...Array.from({ length: 5 }, (_, i) => ({
        code: String(28600 + i), name: `Subject ${i}`, credit: 3,
        theoryMaxMarks: 150, practicalMaxMarks: 0, ppwTheory: 3,
        ppwPractical: 0, type: 'theory'
      }))]
    }]
  };
}

async function studentToken(): Promise<string> {
  const res = await request(app).post('/api/v1/auth/register')
    .send({ name: 'Student One', email: 'stu@d.com', password: 'Password123' });
  return res.body.data.accessToken;
}

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

beforeAll(async () => { await startMongo(); });
beforeEach(async () => { await clearDb(); });
afterAll(async () => { await stopMongo(); });

describe('bteb subject catalog', () => {
  it('lists technologies grouped by regulation with counts', async () => {
    await BtebSubjectCollection.insertMany([
      bs(2022, 'Computer Technology', 'computer-technology', 5, '28553'),
      bs(2022, 'Computer Technology', 'computer-technology', 5, '28554'),
      bs(2016, 'Computer Technology', 'computer-technology', 1, '65711')
    ]);

    const all = await request(app).get('/api/v1/bteb-subjects/technologies');
    expect(all.status).toBe(200);
    expect(all.body.success).toBe(true);
    expect(all.body.data.technologies).toHaveLength(2);

    const byReg = await request(app).get('/api/v1/bteb-subjects/technologies?regulation=2022');
    expect(byReg.body.data.technologies).toHaveLength(1);
    const tech = byReg.body.data.technologies[0];
    expect(tech.technologySlug).toBe('computer-technology');
    expect(tech.regulation).toBe(2022);
    expect(tech.subjectCount).toBe(2);
  });

  it('lists subjects with filters, search and pagination meta', async () => {
    await BtebSubjectCollection.insertMany([
      bs(2022, 'Computer Technology', 'computer-technology', 5, '28553'),
      bs(2022, 'Computer Technology', 'computer-technology', 5, '28554'),
      bs(2022, 'Civil Technology', 'civil-technology', 5, '28571')
    ]);

    const byTech = await request(app).get('/api/v1/bteb-subjects/subjects?technologySlug=computer-technology');
    expect(byTech.status).toBe(200);
    expect(byTech.body.data.items).toHaveLength(2);
    expect(byTech.body.meta.total).toBe(2);

    const bySem = await request(app).get('/api/v1/bteb-subjects/subjects?technologySlug=computer-technology&semester=5');
    expect(bySem.body.data.items).toHaveLength(2);

    const byCode = await request(app).get('/api/v1/bteb-subjects/subjects?q=28553');
    expect(byCode.body.data.items).toHaveLength(1);
    expect(byCode.body.data.items[0].name).toBe('Computer Architecture & Microprocessor');

    const paged = await request(app).get('/api/v1/bteb-subjects/subjects?page=1&limit=1');
    expect(paged.body.data.items).toHaveLength(1);
    expect(paged.body.meta).toMatchObject({ page: 1, limit: 1, total: 3, totalPages: 3 });

    const invalid = await request(app).get('/api/v1/bteb-subjects/subjects?semester=99');
    expect(invalid.status).toBe(400);
  });

  it('resolves subject names only when authenticated', async () => {
    await BtebSubjectCollection.insertMany([
      bs(2022, 'Computer Technology', 'computer-technology', 5, '28553'),
      bs(2022, 'Computer Technology', 'computer-technology', 6, '25852')
    ]);

    const noAuth = await request(app).get('/api/v1/bteb-subjects/names?codes=28553');
    expect(noAuth.status).toBe(401);

    const token = await studentToken();
    const res = await request(app).get('/api/v1/bteb-subjects/names?codes=28553,25852,99999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const names = res.body.data.names as Array<{ code: string; name: string }>;
    expect(names.find((n) => n.code === '28553')?.name).toBe('Computer Architecture & Microprocessor');
    expect(names.find((n) => n.code === '25852')).toBeTruthy();
    expect(names.find((n) => n.code === '99999')).toBeUndefined();

    const tooLong = await request(app).get(`/api/v1/bteb-subjects/names?codes=${Array.from({ length: 170 }, (_, i) => String(20000 + i)).join(',')}`)
      .set('Authorization', `Bearer ${token}`);
    expect(tooLong.status).toBe(400);
  });

  it('imports catalog by admin, upserts without duplicates, rejects others', async () => {
    const token = await adminToken();

    const noAuth = await request(app).post('/api/v1/bteb-subjects/admin/import').send({});
    expect(noAuth.status).toBe(401);

    const importBody = { source: 'test', regulation: 2022, technologies: [row()] };
    const res = await request(app).post('/api/v1/bteb-subjects/admin/import')
      .set('Authorization', `Bearer ${token}`)
      .send(importBody);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ technologies: 1, rows: 6 });

    const second = await request(app).post('/api/v1/bteb-subjects/admin/import')
      .set('Authorization', `Bearer ${token}`)
      .send(importBody);
    expect(second.status).toBe(200);
    expect(second.body.data.technologies).toBe(1);
    expect(await BtebSubjectCollection.countDocuments()).toBe(6);

    const student = await studentToken();
    const forbidden = await request(app).post('/api/v1/bteb-subjects/admin/import')
      .set('Authorization', `Bearer ${student}`)
      .send(importBody);
    expect(forbidden.status).toBe(403);

    const bad = await request(app).post('/api/v1/bteb-subjects/admin/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ regulation: 'nope' });
    expect(bad.status).toBe(400);
  });

  it('enriches referred subject names on /results/check and history', async () => {
    await BtebSubjectCollection.insertMany([
      bs(2022, 'Computer Technology', 'computer-technology', 5, '28553')
    ]);
    const db = mongoose.connection.useDb('results_db');
    await db.collection('records').insertOne({
      examId: 'eng-5th-2026-11', roll: '712990', name: 'Student Two',
      gpa: null, status: 'referred',
      subjects: [{ code: '28553', type: 'T', grade: null }]
    });
    await db.collection('exams').insertOne({
      examId: 'eng-5th-2026-11', recordCount: 1, title: 'Diploma in Engineering 5th Semester'
    });

    const token = await studentToken();
    const check = await request(app).get('/api/v1/results/check?examId=eng-5th-2026-11&roll=712990')
      .set('Authorization', `Bearer ${token}`);
    expect(check.status).toBe(200);
    expect(check.body.data.subjects[0]).toMatchObject({
      code: '28553', type: 'T', name: 'Computer Architecture & Microprocessor'
    });

    const history = await request(app).get('/api/v1/results/history?roll=712990')
      .set('Authorization', `Bearer ${token}`);
    expect(history.status).toBe(200);
    expect(history.body.data.records[0].subjects[0].name).toBe('Computer Architecture & Microprocessor');
  });

  it('returns null names gracefully when the catalog is empty', async () => {
    const db = mongoose.connection.useDb('results_db');
    await db.collection('records').insertOne({
      examId: 'eng-5th-2026-11', roll: '712981', gpa: 3.18, status: 'pass',
      subjects: [{ code: '28999', type: 'T', grade: 'A-' }]
    });
    await db.collection('exams').insertOne({
      examId: 'eng-5th-2026-11', recordCount: 1, title: 'Diploma in Engineering 5th Semester'
    });

    const token = await studentToken();
    const check = await request(app).get('/api/v1/results/check?examId=eng-5th-2026-11&roll=712981')
      .set('Authorization', `Bearer ${token}`);
    expect(check.status).toBe(200);
    expect(check.body.data.subjects[0].name).toBeNull();
  });
});

function bs(
  regulation: number, technology: string, technologySlug: string,
  semester: number, code: string
) {
  return {
    technology, technologySlug, regulation, semester,
    groupCode: null, groupLabel: null,
    code, name: code === '28553' ? 'Computer Architecture & Microprocessor'
      : code === '25852' ? 'Industrial Management' : `Subject ${code}`,
    credits: 4, theoryMaxMarks: 150, practicalMaxMarks: 50,
    ppwTheory: 3, ppwPractical: 2, type: 'theory_practical'
  };
}
