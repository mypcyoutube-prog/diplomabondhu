import mongoose from 'mongoose';
import type { Env } from '../../config/env';
import { notFound } from '../../core/errors';
import { writeAudit } from '../../models/audit-log.model';
import { AppSettings } from '../../models/app-settings.model';
import { resolveSubjectNames } from '../bteb-subjects/bteb-subjects.service';
import { getAppSettings } from '../settings/settings.routes';

export interface ResultExam {
  examId: string;
  recordCount: number;
  title?: string;
  checkCount: number;
  updatedAt?: string;
}

export interface ResultRecord {
  examId: string;
  title?: string | null;
  roll: string;
  name: string | null;
  registrationNo: string | null;
  gpa: number | null;
  cgpa?: number | null;
  status: string | null;
  subjects: Array<{
    code?: string;
    grade?: string;
    type?: string;
    name?: string | null;
    semester?: number | null;
  }>;
  publishedAt?: string | null;
  instituteCode?: string | null;
  institute?: string | null;
  semesterGpas?: Record<string, number | null>;
  examSemester?: number | null;
  disclaimer: string;
}

export interface TimelineSubject {
  code?: string;
  grade?: string;
  type?: string;
  name?: string | null;
  semester?: number | null;
  cleared?: boolean;
}

export interface TimelineSemester {
  semester: number;
  gpa: number | null;
  publishedAt: string | null;
  subjects: TimelineSubject[];
}

export interface ResultTimeline {
  roll: string;
  name: string | null;
  registrationNo: string | null;
  institute: string | null;
  title?: string | null;
  status: string | null;
  cgpa: number | null;
  examSemester: number | null;
  bannerSubjects: number;
  semesters: TimelineSemester[];
  disclaimer: string;
}

export const RESULT_DISCLAIMER =
  'This is not an official BTEB service. Results are transcribed from published result sheets and may contain errors. Verify with your institute or the official BTEB portal.';

export function resultsDb(env: Env) {
  return mongoose.connection.useDb(env.RESULTS_DB, { useCache: true });
}

export async function listResultExams(env: Env): Promise<ResultExam[]> {
  const docs = await resultsDb(env)
    .collection('exams')
    .find({})
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  return docs.map((d) => ({
    examId: String(d.examId ?? ''),
    recordCount: Number(d.recordCount ?? 0),
    title: typeof d.title === 'string' && d.title ? d.title : undefined,
    checkCount: Number(d.checkCount ?? 0),
    updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : undefined
  }));
}

function isoDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value) return value;
  return null;
}

export async function checkResult(env: Env, examId: string, roll: string, registrationNo?: string): Promise<ResultRecord> {
  const db = resultsDb(env);
  const doc = await db.collection('records').findOne({ examId, roll: String(roll) });
  if (!doc) throw notFound('No result found for this roll in the selected examination');
  if (registrationNo && typeof doc.registrationNo === 'string' && doc.registrationNo && doc.registrationNo !== registrationNo) {
    throw notFound('Roll and registration do not match in this examination');
  }
  await db
    .collection('exams')
    .updateOne({ examId }, { $inc: { checkCount: 1 }, $setOnInsert: { examId } }, { upsert: true });
  const examDoc = await db.collection('exams').findOne(
    { examId },
    { projection: { updatedAt: 1 } }
  );
      return {
        examId,
        title: typeof doc.meta?.title === 'string' && doc.meta.title ? doc.meta.title : undefined,
    roll: String(doc.roll),
    publishedAt: isoDate(examDoc?.updatedAt),
    name: typeof doc.name === 'string' ? doc.name : null,
    registrationNo: typeof doc.registrationNo === 'string' ? doc.registrationNo : null,
    gpa: typeof doc.gpa === 'number' ? doc.gpa : null,
    cgpa: typeof doc.cgpa === 'number' ? doc.cgpa : null,
    status: typeof doc.status === 'string' ? doc.status : null,
    subjects: await attachSubjectNames(Array.isArray(doc.subjects) ? doc.subjects : []),
    instituteCode: typeof doc.instituteCode === 'string' ? doc.instituteCode : null,
    institute: typeof doc.institute === 'string' ? doc.institute : null,
    semesterGpas:
      doc.semesterGpas && typeof doc.semesterGpas === 'object' && !Array.isArray(doc.semesterGpas)
        ? (doc.semesterGpas as Record<string, number | null>)
        : undefined,
    examSemester: typeof doc.examSemester === 'number' ? doc.examSemester : null,
    disclaimer: RESULT_DISCLAIMER
  };
}

export async function resultHistory(env: Env, rawRoll: string): Promise<ResultRecord[]> {
  const db = resultsDb(env);
  const roll = String(rawRoll);
  const docs = await db
    .collection('records')
    .find({ roll })
    .sort({ examSemester: -1, _id: -1 })
    .limit(50)
    .toArray();
  if (docs.length === 0) throw notFound('No published result found for this roll');
  const examIds = [...new Set(docs.map((d) => String(d.examId)))];
  const examDocs = await db
    .collection('exams')
    .find({ examId: { $in: examIds } })
    .toArray();
  const titles = new Map<string, string>();
  const publishedAt = new Map<string, string>();
  for (const e of examDocs) {
    if (typeof e.title === 'string' && e.title) titles.set(String(e.examId), e.title);
    const iso = isoDate(e.updatedAt);
    if (iso) publishedAt.set(String(e.examId), iso);
  }
  await Promise.all(
    examIds.map((examId) =>
      db
        .collection('exams')
        .updateOne({ examId }, { $inc: { checkCount: 1 }, $setOnInsert: { examId } }, { upsert: true })
    )
  );
  const records = await Promise.all(
    docs.map(async (doc) => {
      const examId = String(doc.examId);
    return {
      examId,
      title: titles.get(examId) ?? (typeof doc.meta?.title === 'string' && doc.meta.title ? doc.meta.title : undefined),
      roll: String(doc.roll),
      name: typeof doc.name === 'string' ? doc.name : null,
      registrationNo: typeof doc.registrationNo === 'string' ? doc.registrationNo : null,
      gpa: typeof doc.gpa === 'number' ? doc.gpa : null,
      cgpa: typeof doc.cgpa === 'number' ? doc.cgpa : null,
      status: typeof doc.status === 'string' ? doc.status : null,
      subjects: await attachSubjectNames(Array.isArray(doc.subjects) ? doc.subjects : []),
      instituteCode: typeof doc.instituteCode === 'string' ? doc.instituteCode : null,
      institute: typeof doc.institute === 'string' ? doc.institute : null,
      semesterGpas:
        doc.semesterGpas && typeof doc.semesterGpas === 'object' && !Array.isArray(doc.semesterGpas)
          ? (doc.semesterGpas as Record<string, number | null>)
          : undefined,
      examSemester: typeof doc.examSemester === 'number' ? doc.examSemester : null,
      publishedAt: publishedAt.get(examId) ?? null,
      disclaimer: RESULT_DISCLAIMER
      };
    })
  );
  return records as ResultRecord[];
}

/** Full academic journey for a roll, computed server-side so the client
 *  never has to re-implement cleared/referred rules.
 *
 *  - Semester GPA: the most recent non-null value across cumulative sheets.
 *  - publishedAt per semester: only from the record whose own examSemester
 *    matches (each semester exam is published on its own date, ~6 months apart).
 *  - A referred subject stays listed under its own semester, but renders as
 *    cleared when its cumulative GPA is known in a later sheet AND the code
 *    no longer appears in the latest record's pending subjects. */
export async function resultTimeline(env: Env, rawRoll: string): Promise<ResultTimeline> {
  const db = resultsDb(env);
  const roll = String(rawRoll);
  const docs = await db
    .collection('records')
    .find({ roll })
    .sort({ examSemester: -1, _id: -1 })
    .limit(50)
    .toArray();
  if (docs.length === 0) throw notFound('No published result found for this roll');
  const examIds = [...new Set(docs.map((d) => String(d.examId)))];
  const examDocs = await db
    .collection('exams')
    .find({ examId: { $in: examIds } })
    .toArray();
  const titles = new Map<string, string>();
  const publishedByExam = new Map<string, string>();
  for (const e of examDocs) {
    if (typeof e.title === 'string' && e.title) titles.set(String(e.examId), e.title);
    const iso = isoDate(e.updatedAt);
    if (iso) publishedByExam.set(String(e.examId), iso);
  }
  await Promise.all(
    examIds.map((examId) =>
      db
        .collection('exams')
        .updateOne({ examId }, { $inc: { checkCount: 1 }, $setOnInsert: { examId } }, { upsert: true })
    )
  );

  const latest = docs[0];
  const latestSubjectList = Array.isArray(latest.subjects)
    ? (latest.subjects as Array<{ code?: string }>)
    : [];
  const latestCodes = new Set(
    latestSubjectList
      .map((s) => String(s.code ?? '').trim().toUpperCase())
      .filter(Boolean)
  );

  const publishedBySemester = new Map<number, string>();
  for (const doc of docs) {
    const sem = typeof doc.examSemester === 'number' ? doc.examSemester : null;
    if (sem == null || publishedBySemester.has(sem)) continue;
    publishedBySemester.set(sem, publishedByExam.get(String(doc.examId)) ?? '');
  }

  const asc = [...docs].reverse();
  const latestGpa = new Map<number, number | null>();
  for (const doc of asc) {
    const gps = doc.semesterGpas;
    if (!gps || typeof gps !== 'object' || Array.isArray(gps)) continue;
    for (const [key, value] of Object.entries(gps as Record<string, unknown>)) {
      const m = key.match(/gpa(\d+)/i) ?? key.match(/^(\d+)$/);
      if (!m) continue;
      if (typeof value === 'number') latestGpa.set(Number(m[1]), value);
      else if (!latestGpa.has(Number(m[1]))) latestGpa.set(Number(m[1]), null);
    }
  }

  const backlog = new Map<number, TimelineSubject[]>();
  // Boards repeat a still-failed subject in every later sheet; the subject
  // must render exactly once, under its own semester (catalog semester when
  // known, else the earliest exam that reported it) — never once per record.
  const codeSemester = new Map<string, number>();
  for (const doc of asc) {
    const examSem = typeof doc.examSemester === 'number' ? doc.examSemester : null;
    const subjects = Array.isArray(doc.subjects)
      ? (doc.subjects as Array<{ code?: string; grade?: string; type?: string }>)
      : [];
    if (subjects.length === 0) continue;
    const enriched = await attachSubjectNames(subjects);
    for (const s of enriched) {
      const code = String(s.code ?? '').trim().toUpperCase();
      if (!code) continue;
      let sem =
        typeof s.semester === 'number' && s.semester > 0 ? s.semester : examSem;
      if (sem == null) continue;
      const assigned = codeSemester.get(code);
      if (assigned === undefined) codeSemester.set(code, sem);
      else sem = assigned;
      const list = backlog.get(sem) ?? [];
      const entry: TimelineSubject = {
        code: s.code,
        grade: s.grade,
        type: s.type,
        name: s.name ?? null,
        semester: s.semester ?? null
      };
      const existing = list.find((x) => String(x.code ?? '').toUpperCase() === code);
      if (existing) Object.assign(existing, entry);
      else list.push(entry);
      backlog.set(sem, list);
    }
  }
  for (const [sem, list] of backlog) {
    const gpa = latestGpa.get(sem);
    const known = gpa != null;
    for (const s of list) {
      const code = String(s.code ?? '').toUpperCase();
      s.cleared = known && !latestCodes.has(code);
    }
  }

  const semesterNumbers = [...new Set<number>([...latestGpa.keys(), ...backlog.keys()])].sort(
    (a, b) => b - a
  );
  const semesters: TimelineSemester[] = semesterNumbers.map((sem) => ({
    semester: sem,
    gpa: latestGpa.get(sem) ?? null,
    publishedAt: publishedBySemester.get(sem) ?? null,
    subjects: backlog.get(sem) ?? []
  }));

  return {
    roll,
    name: typeof latest.name === 'string' ? latest.name : null,
    registrationNo: typeof latest.registrationNo === 'string' ? latest.registrationNo : null,
    institute: typeof latest.institute === 'string' ? latest.institute : null,
    title:
      titles.get(String(latest.examId)) ??
      (typeof latest.meta?.title === 'string' && latest.meta.title ? latest.meta.title : null),
    status: typeof latest.status === 'string' ? latest.status : null,
    cgpa: typeof latest.cgpa === 'number' ? latest.cgpa : null,
    examSemester: typeof latest.examSemester === 'number' ? latest.examSemester : null,
    bannerSubjects: latestCodes.size,
    semesters,
    disclaimer: RESULT_DISCLAIMER
  };
}

/** Drive API key: env var wins; otherwise the key the admin saved in
 *  Settings (field has `select: false`, so it is only read here). */
export async function loadDriveApiKey(env: Env): Promise<string> {
  if (env.GOOGLE_DRIVE_API_KEY) return env.GOOGLE_DRIVE_API_KEY;
  const settings = await AppSettings.findOne({}).select('+integrations.googleDriveApiKey');
  return settings?.integrations?.googleDriveApiKey ?? '';
}

export function maskKey(key: string): string | null {
  if (!key) return null;
  return `${key.slice(0, 5)}…${key.slice(-4)}`;
}

export async function setDriveKey(actorId: string, apiKey: string | null, ip?: string): Promise<void> {
  const settings = await getAppSettings();  // seeds the doc (and heals sections) when missing
  settings.integrations = { ...settings.integrations, googleDriveApiKey: apiKey ?? undefined };
  await settings.save();
  await writeAudit({
    actorId,
    action: apiKey ? 'results.drive_key.set' : 'results.drive_key.cleared',
    targetType: 'AppSettings',
    targetId: String(settings._id),
    ip
  });
}

/** Referred subjects carry code + T/P; join the catalog for names.
 *  Safe even when the catalog is empty — names are just skipped. */
export async function attachSubjectNames(
  subjects: Array<{ code?: string; grade?: string; type?: string }>
): Promise<
  Array<{ code?: string; grade?: string; type?: string; name?: string | null; semester?: number | null }>
> {
  if (subjects.length === 0) return subjects;
  const resolved = await resolveSubjectNames(subjects.map((s) => s.code));
  if (resolved.size === 0) return subjects.map((s) => ({ ...s, name: null, semester: null }));
  return subjects.map((s) => {
    const key = String(s.code ?? '').trim().toUpperCase();
    return { ...s, name: resolved.get(key)?.name ?? null, semester: resolved.get(key)?.semester ?? null };
  });
}

export async function auditResultImport(
  actorId: string,
  payload: { batchId: string; examId: string; total?: number; inserted?: number; updated?: number },
  ip?: string
): Promise<void> {
  await writeAudit({
    actorId,
    action: 'results.import',
    targetType: 'result_exam',
    targetId: payload.examId,
    after: payload,
    ip
  });
}
