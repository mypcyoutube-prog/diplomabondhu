// Idempotent Home Management seed. Creates the approved default Quick Access
// tiles, Study Resource categories, one demo notice and one demo upcoming
// exam only when their slug/title does not exist at all. Never updates or
// overwrites existing content. Run manually:
//   npx ts-node src/scripts/seed-home-defaults.ts
// Safe to run repeatedly.
//
// Demo records are clearly labelled "Demo" so admins can find and replace
// them with real content from the Admin Panel. No fake BTEB results, no fake
// student data, no fake counts: resource counts are always computed live
// from the StudyMaterial collection.
import mongoose from 'mongoose';
import { loadEnv } from '../config/env';
import { QuickAccessItem } from '../models/quick-access-item.model';
import { StudyResourceCategory } from '../models/study-resource-category.model';
import { Announcement } from '../models/announcement.model';
import { Exam } from '../models/exam.model';
import { CommunityPost } from '../models/community-post.model';
import { User } from '../models/user.model';

const QUICK_ACCESS_DEFAULTS = [
  { slug: 'quick-study-materials', titleEn: 'Study Materials', titleBn: 'স্টাডি ম্যাটেরিয়াল', icon: 'menu_book_rounded', route: '/library', bgColor: '#D1FAE5', fgColor: '#059669', displayOrder: 1 },
  { slug: 'quick-syllabus', titleEn: 'Syllabus', titleBn: 'সিলেবাস', icon: 'description_rounded', route: '/subjects', bgColor: '#DBEAFE', fgColor: '#1D4ED8', displayOrder: 2 },
  { slug: 'quick-past-questions', titleEn: 'Previous Questions', titleBn: 'পূর্ববর্তী প্রশ্ন', icon: 'quiz_rounded', route: '/exams', bgColor: '#EDE9FE', fgColor: '#6D28D9', displayOrder: 3 },
  { slug: 'quick-cgpa-calculator', titleEn: 'CGPA Calculator', titleBn: 'সিজিপিএ ক্যালকুলেটর', icon: 'functions_rounded', route: '/gpa/cgpa', bgColor: '#FEF3C7', fgColor: '#B45309', displayOrder: 4 },
  { slug: 'quick-community', titleEn: 'Community', titleBn: 'কমিউনিটি', icon: 'groups_rounded', route: '/community', bgColor: '#FCE7F3', fgColor: '#BE185D', displayOrder: 5 },
  { slug: 'quick-planner', titleEn: 'Planner', titleBn: 'প্ল্যানার', icon: 'event_note_rounded', route: '/planner', bgColor: '#E0F2FE', fgColor: '#0369A1', displayOrder: 6 }
];

const STUDY_RESOURCE_DEFAULTS = [
  { slug: 'resource-notes', titleEn: 'Notes', titleBn: 'নোট', icon: 'edit_note_rounded', route: '/library', bgColor: '#D1FAE5', fgColor: '#059669', materialTypes: ['note'], displayOrder: 1 },
  { slug: 'resource-collections', titleEn: 'Collections', titleBn: 'কালেকশন', icon: 'folder_special_rounded', route: '/library', bgColor: '#EDE9FE', fgColor: '#6D28D9', materialTypes: ['subject_material'], displayOrder: 2 },
  { slug: 'resource-past-papers', titleEn: 'Past Papers', titleBn: 'পাস্ট পেপার', icon: 'history_edu_rounded', route: '/library', bgColor: '#DBEAFE', fgColor: '#1D4ED8', materialTypes: ['past_question'], displayOrder: 3 },
  { slug: 'resource-video-lectures', titleEn: 'Video Lectures', titleBn: 'ভিডিও লেকচার', icon: 'play_circle_rounded', route: '/library', bgColor: '#FFEDD5', fgColor: '#C2410C', materialTypes: ['video'], displayOrder: 4 }
];

const DEMO_NOTICE_TITLE = 'ডেমো নোটিশ — Admin Panel থেকে আসল নোটিশ দিন';
const DEMO_EXAM_TITLE = 'Mathematics (ডেমো)';

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

  const noticeExists = await Announcement.findOne({ title: DEMO_NOTICE_TITLE });
  if (!noticeExists) {
    await Announcement.create({
      title: DEMO_NOTICE_TITLE,
      body: 'এটি একটি ডেমো নোটিশ। Admin Panel-এর Announcements থেকে এটি মুছে আসল নোটিশ যোগ করুন।',
      category: 'announcement',
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

  const examExists = await Exam.findOne({ title: DEMO_EXAM_TITLE });
  if (!examExists) {
    await Exam.create({
      title: DEMO_EXAM_TITLE,
      description: '2nd Semester (Regular) — ডেমো exam; Admin Panel → Exams থেকে মুছে আসল exam দিন।',
      type: 'semester',
      durationSec: 3600,
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
    const postTitle = 'ডেমো পোস্ট — কমিউনিটি আপডেট দেখানোর উদাহরণ';
    const postExists = await CommunityPost.findOne({ title: postTitle });
    if (!postExists) {
      await CommunityPost.create({
        authorId: admin._id,
        title: postTitle,
        body: 'এটি একটি ডেমো পোস্ট। Admin Panel → Community থেকে এটি সরিয়ে আসল পোস্ট Featured করুন।',
        tags: ['Study Tips'],
        type: 'discussion',
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
