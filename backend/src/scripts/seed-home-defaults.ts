// Idempotent Home Management seed. Reads all default content from
// backend/data/home-seed.json (same data-file pattern as
// seed-bteb-subjects.ts) and creates items only when their slug/title does
// not exist at all. Never updates or overwrites existing content.
//
//   npx ts-node src/scripts/seed-home-defaults.ts
// Safe to run repeatedly.
//
// Demo records are clearly labelled "Demo" so admins can find and replace
// them with real content from the Admin Panel. No fake BTEB results, no fake
// student data, no fake counts: resource counts are always computed live
// from the StudyMaterial collection. Banners are not seeded because they
// require a real uploaded image — add them from Admin Panel → Banners.
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { loadEnv } from '../config/env';
import { QuickAccessItem } from '../models/quick-access-item.model';
import { StudyResourceCategory } from '../models/study-resource-category.model';
import { Announcement } from '../models/announcement.model';
import { Exam } from '../models/exam.model';
import { CommunityPost } from '../models/community-post.model';
import { User } from '../models/user.model';

interface SeedQuickItem {
  slug: string;
  titleEn: string;
  titleBn: string;
  icon: string;
  route: string;
  bgColor: string;
  fgColor: string;
  displayOrder: number;
}

interface SeedResourceItem {
  slug: string;
  titleEn: string;
  titleBn: string;
  icon: string;
  route: string;
  bgColor: string;
  fgColor: string;
  materialTypes: string[];
  displayOrder: number;
}

interface HomeSeedFile {
  quickAccess: SeedQuickItem[];
  studyResources: SeedResourceItem[];
  demoNotice: { title: string; body: string; category: string };
  demoExam: { title: string; description: string; type: string; durationSec: number };
  demoCommunityPost: { title: string; body: string; tags: string[]; type: string };
}

function loadHomeSeed(): HomeSeedFile {
  const file = path.resolve(process.cwd(), 'data', 'home-seed.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as HomeSeedFile;
}

async function seedHomeDefaults() {
  const env = loadEnv();
  const seed = loadHomeSeed();
  await mongoose.connect(env.MONGODB_URI);
  console.log('Environment check: MONGODB_URI host =', new URL(env.MONGODB_URI.replace('mongodb://', 'http://')).host);

  let created = 0;
  let existing = 0;

  for (const item of seed.quickAccess) {
    const exists = await QuickAccessItem.findOne({ slug: item.slug });
    if (exists) { existing++; continue; }
    await QuickAccessItem.create({ ...item, status: 'published', visibility: true });
    created++;
    console.log('Created QuickAccessItem:', item.slug);
  }
  for (const item of seed.studyResources) {
    const exists = await StudyResourceCategory.findOne({ slug: item.slug });
    if (exists) { existing++; continue; }
    await StudyResourceCategory.create({ ...item, status: 'published', visibility: true });
    created++;
    console.log('Created StudyResourceCategory:', item.slug);
  }

  const noticeExists = await Announcement.findOne({ title: seed.demoNotice.title });
  if (!noticeExists) {
    await Announcement.create({
      title: seed.demoNotice.title,
      body: seed.demoNotice.body,
      category: seed.demoNotice.category,
      source: 'admin',
      status: 'published',
      visible: true,
      publishedAt: new Date()
    });
    created++;
    console.log('Created demo Announcement');
  } else {
    existing++;
  }

  const examExists = await Exam.findOne({ title: seed.demoExam.title });
  if (!examExists) {
    await Exam.create({
      title: seed.demoExam.title,
      description: seed.demoExam.description,
      type: seed.demoExam.type,
      durationSec: seed.demoExam.durationSec,
      marksPerQuestion: 1,
      status: 'published',
      scheduledAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
    });
    created++;
    console.log('Created demo Exam');
  } else {
    existing++;
  }

  const admin = await User.findOne({ role: 'admin', status: 'active' });
  if (admin) {
    const postExists = await CommunityPost.findOne({ title: seed.demoCommunityPost.title });
    if (!postExists) {
      await CommunityPost.create({
        authorId: admin._id,
        title: seed.demoCommunityPost.title,
        body: seed.demoCommunityPost.body,
        tags: seed.demoCommunityPost.tags,
        type: seed.demoCommunityPost.type,
        status: 'visible',
        featured: true,
        featuredAt: new Date(),
        featuredBy: admin._id
      });
      created++;
      console.log('Created demo CommunityPost (featured)');
    } else {
      existing++;
    }
  } else {
    console.log('No active admin user found — skipping demo community post.');
  }

  console.log('Seed complete: ' + created + ' created, ' + existing + ' already existed (skipped).');
  console.log('Note: banners need a real image URL — add them from Admin Panel → Banners.');
  await mongoose.disconnect();
}

seedHomeDefaults().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
