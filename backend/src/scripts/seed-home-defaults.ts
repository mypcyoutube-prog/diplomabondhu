// Idempotent Home Management seed. Creates the approved default Quick Access
// tiles and Study Resource categories only when their slug does not exist at
// all (active or in trash). Never updates or overwrites existing content.
// Run manually: npx ts-node src/scripts/seed-home-defaults.ts
// (or the project's configured TS runner). Safe to run repeatedly.
import mongoose from 'mongoose';
import { loadEnv } from '../config/env';
import { QuickAccessItem } from '../models/quick-access-item.model';
import { StudyResourceCategory } from '../models/study-resource-category.model';

const QUICK_ACCESS_DEFAULTS = [
  { slug: 'quick-study', titleEn: 'Study', titleBn: 'স্টাডি', icon: 'menu_book_rounded', route: '/library', bgColor: '#E0F2F1', fgColor: '#00897B', displayOrder: 1 },
  { slug: 'quick-exams', titleEn: 'Exams', titleBn: 'পরীক্ষা', icon: 'quiz_rounded', route: '/exams', bgColor: '#E3F2FD', fgColor: '#1565C0', displayOrder: 2 },
  { slug: 'quick-cgpa', titleEn: 'CGPA', titleBn: 'সিজিপিএ', icon: 'functions_rounded', route: '/gpa/cgpa', bgColor: '#F3E5F5', fgColor: '#6A1B9A', displayOrder: 3 },
  { slug: 'quick-community', titleEn: 'Community', titleBn: 'কমিউনিটি', icon: 'groups_rounded', route: '/community', bgColor: '#FFF3E0', fgColor: '#E65100', displayOrder: 4 },
  { slug: 'quick-notices', titleEn: 'Notices', titleBn: 'নোটিশ', icon: 'campaign_rounded', route: '/notices', bgColor: '#FCE4EC', fgColor: '#AD1457', displayOrder: 5 }
];

const STUDY_RESOURCE_DEFAULTS = [
  { slug: 'resource-books', titleEn: 'Books', titleBn: 'বই', icon: 'auto_stories_rounded', route: '/library', bgColor: '#E0F2F1', fgColor: '#00897B', materialTypes: ['book'], displayOrder: 1 },
  { slug: 'resource-notes', titleEn: 'Notes', titleBn: 'নোট', icon: 'edit_note_rounded', route: '/library', bgColor: '#E3F2FD', fgColor: '#1565C0', materialTypes: ['note'], displayOrder: 2 },
  { slug: 'resource-videos', titleEn: 'Videos', titleBn: 'ভিডিও', icon: 'play_circle_rounded', route: '/library', bgColor: '#F3E5F5', fgColor: '#6A1B9A', materialTypes: ['video'], displayOrder: 3 },
  { slug: 'resource-subject-materials', titleEn: 'Subject Materials', titleBn: 'সাবজেক্ট ম্যাটেরিয়ালস', icon: 'folder_special_rounded', route: '/library', bgColor: '#FFF3E0', fgColor: '#E65100', materialTypes: ['subject_material'], displayOrder: 4 }
];

async function seedHomeDefaults() {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);
  console.log('Environment check: MONGODB_URI host =', new URL(env.MONGODB_URI.replace('mongodb://', 'http://')).host);

  let created = 0;
  let existing = 0;
  for (const item of QUICK_ACCESS_DEFAULTS) {
    const exists = await QuickAccessItem.findOne({ slug: item.slug });
    if (exists) { existing++; continue; }
    await QuickAccessItem.create({ ...item, status: 'published', visibility: true });
    created++;
    console.log('Created QuickAccessItem:', item.slug);
  }
  for (const item of STUDY_RESOURCE_DEFAULTS) {
    const exists = await StudyResourceCategory.findOne({ slug: item.slug });
    if (exists) { existing++; continue; }
    await StudyResourceCategory.create({ ...item, status: 'published', visibility: true });
    created++;
    console.log('Created StudyResourceCategory:', item.slug);
  }
  console.log(`Seed complete: ${created} created, ${existing} already existed (skipped).`);
  await mongoose.disconnect();
}

seedHomeDefaults().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
