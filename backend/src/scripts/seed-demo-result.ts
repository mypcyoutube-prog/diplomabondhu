// Idempotent demo result seed. Reads backend/data/results-seed.json and:
//  1. Upserts result records into the RESULTS_DB database (results_db by
//     default) — the same collections the real result import writes to.
//  2. Optionally activates the AppSettings result display window so the home
//     result bar becomes visible — ONLY when result display is not already
//     enabled. Admin-configured settings are never overwritten.
//
// Edit the rolls/cgpa values in results-seed.json to match real student
// accounts for testing. Records are clearly demo-labelled.
//
//   npx ts-node src/scripts/seed-demo-result.ts
// Safe to run repeatedly.
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { loadEnv } from '../config/env';

interface SeedRecord {
  roll: string;
  registrationNo?: string | null;
  name?: string | null;
  cgpa?: number | null;
  gpa?: number | null;
  examSemester?: number | null;
  status?: string | null;
}

interface ResultSeedFile {
  examId: string;
  title: string;
  activateDisplayWindow?: boolean;
  records: SeedRecord[];
}

function loadResultSeed(): ResultSeedFile {
  const file = path.resolve(process.cwd(), 'data', 'results-seed.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as ResultSeedFile;
}

async function seedDemoResult() {
  const env = loadEnv();
  const seed = loadResultSeed();
  if (!seed.examId || seed.records.length === 0) {
    throw new Error('results-seed.json must define examId and at least one record');
  }
  await mongoose.connect(env.MONGODB_URI);
  console.log('Environment check: MONGODB_URI host =', new URL(env.MONGODB_URI.replace('mongodb://', 'http://')).host);

  const db = mongoose.connection.useDb(env.RESULTS_DB, { useCache: true });
  const now = new Date();

  for (const record of seed.records) {
    const doc: Record<string, unknown> = {
      examId: seed.examId,
      roll: String(record.roll),
      name: record.name ?? null,
      registrationNo: record.registrationNo || null,
      cgpa: typeof record.cgpa === 'number' ? record.cgpa : null,
      gpa: typeof record.gpa === 'number' ? record.gpa : null,
      examSemester: typeof record.examSemester === 'number' ? record.examSemester : null,
      status: record.status ?? null,
      meta: { title: seed.title, demo: true },
      updatedAt: now
    };
    await db.collection('records').replaceOne(
      { examId: seed.examId, roll: doc.roll as string },
      doc,
      { upsert: true }
    );
    console.log('Upserted result record: examId=' + seed.examId + ' roll=' + String(record.roll));
  }

  await db.collection('exams').updateOne(
    { examId: seed.examId },
    { $set: { examId: seed.examId, title: seed.title, recordCount: seed.records.length, updatedAt: now } },
    { upsert: true }
  );
  console.log('Upserted result exam entry:', seed.examId);

  if (seed.activateDisplayWindow) {
    const settings = mongoose.connection.collection('appsettings');
    const current = await settings.findOne({});
    const existing = current?.resultDisplay as { enabled?: boolean } | undefined;
    if (existing?.enabled) {
      console.log('Result display already enabled — settings left untouched.');
    } else {
      await settings.updateOne(
        {},
        {
          $set: {
            'resultDisplay.enabled': true,
            'resultDisplay.examId': seed.examId,
            'resultDisplay.startsAt': now,
            'resultDisplay.endsAt': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        },
        { upsert: true }
      );
      console.log('Result display window activated for 30 days (was disabled).');
    }
  }

  console.log('Demo result seed complete.');
  await mongoose.disconnect();
}

seedDemoResult().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
