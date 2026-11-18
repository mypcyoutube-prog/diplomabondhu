import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { loadEnv } from '../config/env';
import { BtebSubject } from '../models/bteb-subject.model';

interface SeedSubject {
  code: string;
  name: string;
  credit?: number | null;
  theoryMaxMarks?: number | null;
  practicalMaxMarks?: number | null;
  ppwTheory?: number | null;
  ppwPractical?: number | null;
  type?: string | null;
}

interface SeedSemester {
  semester: number;
  group?: { code: string; label: string } | null;
  subjects: SeedSubject[];
  optionalSubjects?: SeedSubject[];
}

interface SeedTechnology {
  slug: string;
  name: string;
  semesters: SeedSemester[];
}

interface SeedFile {
  regulation: number;
  technologies: SeedTechnology[];
}

async function seedBtebSubjects() {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);
  const dataDir = path.resolve(process.cwd(), 'data');
  const files = fs.readdirSync(dataDir).filter((f) => f.startsWith('bteb-subjects-') && f.endsWith('.json')).sort();

  if (files.length === 0) {
    console.error('No bteb-subjects-*.json seed files found in backend/data');
    await mongoose.disconnect();
    process.exit(1);
  }

  let totalRows = 0;
  for (const file of files) {
    const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8')) as SeedFile;
    const ops: unknown[] = [];
    for (const tech of parsed.technologies) {
      for (const sem of tech.semesters) {
        const rows = [...sem.subjects, ...(sem.optionalSubjects ?? [])];
        for (const s of rows) {
          ops.push({
            replaceOne: {
              filter: {
                regulation: parsed.regulation,
                technologySlug: tech.slug.toLowerCase(),
                semester: sem.semester,
                code: s.code.toUpperCase()
              },
              replacement: {
                technology: tech.name,
                technologySlug: tech.slug.toLowerCase(),
                regulation: parsed.regulation,
                semester: sem.semester,
                groupCode: sem.group?.code?.toUpperCase() ?? null,
                groupLabel: sem.group?.label ?? null,
                code: s.code.toUpperCase(),
                name: s.name,
                credits: s.credit ?? null,
                theoryMaxMarks: s.theoryMaxMarks ?? null,
                practicalMaxMarks: s.practicalMaxMarks ?? null,
                ppwTheory: s.ppwTheory ?? null,
                ppwPractical: s.ppwPractical ?? null,
                type: s.type ?? null
              },
              upsert: true
            }
          });
        }
      }
    }
    for (let i = 0; i < ops.length; i += 500) {
      await BtebSubject.bulkWrite(ops.slice(i, i + 500) as never, { ordered: false });
    }
    totalRows += ops.length;
    console.log(`Seeded Regulation ${parsed.regulation}: ${ops.length} subject rows from ${file}`);
  }

  const count = await BtebSubject.countDocuments({});
  console.log(`Done. bteb_subjects now holds ${count} documents (pushed ${totalRows} rows).`);
  await mongoose.disconnect();
}

seedBtebSubjects().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
