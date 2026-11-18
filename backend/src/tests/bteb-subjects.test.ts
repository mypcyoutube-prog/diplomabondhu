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

describe('result timeline', () => {
  it('keeps a still-referred subject red and shows each semester its own date', async () => {
    await BtebSubjectCollection.insertMany([
      bs(2022, 'Computer Technology', 'computer-technology', 5, '28553')
    ]);
    const db = mongoose.connection.useDb('results_db');
    await db.collection('records').insertMany([
      {
        examId: 'eng-5th', roll: '712990', name: 'Student Two', gpa: null, status: 'referred',
        examSemester: 5,
        semesterGpas: { gpa1: 3.30, gpa2: 3.12, gpa3: 3.33, gpa4: 3.18, gpa5: null },
        subjects: [{ code: '28553', type: 'T', grade: null }]
      },
      {
        examId: 'eng-7th', roll: '712990', name: 'Student Two', gpa: 3.54, status: 'pass',
        examSemester: 7, cgpa: 3.44,
        semesterGpas: { gpa1: 3.30, gpa2: 3.12, gpa3: 3.33, gpa4: 3.18, gpa5: null, gpa6: 3.45, gpa7: 3.54 },
        subjects: [{ code: '28553', type: 'T', grade: null }]
      }
    ]);
    await db.collection('exams').insertMany([
      { examId: 'eng-5th', recordCount: 2, title: 'Diploma in Engineering 5th Semester', updatedAt: new Date('2026-06-15T10:00:00.000Z') },
      { examId: 'eng-7th', recordCount: 2, title: 'Diploma in Engineering 7th Semester', updatedAt: new Date('2026-11-10T10:00:00.000Z') }
    ]);

    const token = await studentToken();
    const res = await request(app).get('/api/v1/results/timeline?roll=712990')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.roll).toBe('712990');
    expect(data.bannerSubjects).toBe(1);
    expect(data.semesters.map((s: { semester: number }) => s.semester)).toEqual([7, 6, 5, 4, 3, 2, 1]);

    const sem5 = data.semesters.find((s: { semester: number }) => s.semester === 5);
    expect(sem5.gpa).toBeNull();
    expect(sem5.publishedAt).toBe('2026-06-15T10:00:00.000Z');
    expect(sem5.subjects[0]).toMatchObject({
      code: '28553', name: 'Computer Architecture & Microprocessor', semester: 5
    });
    expect(sem5.subjects[0].cleared).toBeFalsy();

    const sem7 = data.semesters[0];
    expect(sem7.gpa).toBe(3.54);
    expect(sem7.publishedAt).toBe('2026-11-10T10:00:00.000Z');
    expect(sem7.subjects).toHaveLength(0);
    expect(sem7.publishedAt).not.toBe(sem5.publishedAt);
    expect(data.cgpa).toBe(3.44);
  });

  it('marks a referred subject cleared once it passes in a later semester', async () => {
    await BtebSubjectCollection.insertMany([
      bs(2022, 'Computer Technology', 'computer-technology', 5, '28553')
    ]);
    const db = mongoose.connection.useDb('results_db');
    await db.collection('records').insertMany([
      {
        examId: 'eng-5th', roll: '712981', name: 'Student One', gpa: null, status: 'pass',
        examSemester: 5,
        semesterGpas: { gpa1: 3.36, gpa2: 3.34, gpa3: 3.54, gpa4: 3.76, gpa5: null },
        subjects: [{ code: '28553', type: 'T', grade: null }]
      },
      {
        examId: 'eng-7th', roll: '712981', name: 'Student One', gpa: 3.73, status: 'pass',
        examSemester: 7,
        semesterGpas: { gpa1: 3.36, gpa2: 3.34, gpa3: 3.54, gpa4: 3.76, gpa5: 3.76, gpa6: 3.61, gpa7: 3.73 },
        subjects: []
      }
    ]);
    await db.collection('exams').insertMany([
      { examId: 'eng-5th', recordCount: 2, title: 'Diploma in Engineering 5th Semester', updatedAt: new Date('2026-06-15T10:00:00.000Z') },
      { examId: 'eng-7th', recordCount: 2, title: 'Diploma in Engineering 7th Semester', updatedAt: new Date('2026-11-10T10:00:00.000Z') }
    ]);

    const token = await studentToken();
    const res = await request(app).get('/api/v1/results/timeline?roll=712981')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.bannerSubjects).toBe(0);
    const sem5 = data.semesters.find((s: { semester: number }) => s.semester === 5);
    expect(sem5.subjects).toHaveLength(1);
    expect(sem5.subjects[0].code).toBe('28553');
    expect(sem5.subjects[0].cleared).toBe(true);
    expect(sem5.gpa).toBe(3.76);
  });

  it('shows a subject repeated across later sheets exactly once under its own semester', async () => {
    const db = mongoose.connection.useDb('results_db');
    await db.collection('records').insertMany([
      {
        examId: 'eng-6th', roll: '600111', name: 'Student Three', gpa: 3.45, status: 'referred',
        examSemester: 6,
        semesterGpas: { gpa1: 3.30, gpa2: 3.12, gpa3: 3.33, gpa4: 3.18, gpa5: null, gpa6: 3.45 },
        subjects: [{ code: '28553', type: 'T', grade: null }]
      },
      {
        examId: 'eng-7th', roll: '600111', name: 'Student Three', gpa: 3.54, status: 'pass',
        examSemester: 7,
        semesterGpas: { gpa1: 3.30, gpa2: 3.12, gpa3: 3.33, gpa4: 3.18, gpa5: null, gpa6: 3.45, gpa7: 3.54 },
        subjects: [{ code: '28553', type: 'T', grade: null }]
      }
    ]);
    await db.collection('exams').insertMany([
      { examId: 'eng-6th', recordCount: 1, title: 'Diploma in Engineering 6th Semester', updatedAt: new Date('2026-06-15T10:00:00.000Z') },
      { examId: 'eng-7th', recordCount: 1, title: 'Diploma in Engineering 7th Semester', updatedAt: new Date('2026-11-10T10:00:00.000Z') }
    ]);

    const token = await studentToken();
    const res = await request(app).get('/api/v1/results/timeline?roll=600111')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const data = res.body.data;
    const rows = data.semesters.flatMap((s: { subjects: Array<{ code?: string }> }) => s.subjects);
    expect(rows.filter((r: { code?: string }) => r.code === '28553')).toHaveLength(1);
    expect(data.bannerSubjects).toBe(1);
    const carrying = data.semesters.filter((s: { subjects: unknown[] }) => s.subjects.length > 0);
    expect(carrying).toHaveLength(1);
    expect(carrying[0].semester).toBe(6);
    expect(carrying[0].publishedAt).toBe('2026-06-15T10:00:00.000Z');
  });

  it('requires auth and rejects invalid rolls on /results/timeline', async () => {
    const noAuth = await request(app).get('/api/v1/results/timeline?roll=712981');
    expect(noAuth.status).toBe(401);

    const token = await studentToken();
    const bad = await request(app).get('/api/v1/results/timeline?roll=abc')
      .set('Authorization', `Bearer ${token}`);
    expect(bad.status).toBe(400);

    const missing = await request(app).get('/api/v1/results/timeline?roll=555555')
      .set('Authorization', `Bearer ${token}`);
    expect(missing.status).toBe(404);
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
