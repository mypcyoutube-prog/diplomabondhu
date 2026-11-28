import { z } from 'zod';

export const IMPORT_CATEGORIES = [
  'banners',
  'quick_access',
  'study_resources',
  'upcoming_exams',
  'admin_notices',
  'home_config'
] as const;

export type ImportCategoryKey = (typeof IMPORT_CATEGORIES)[number];

export const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/);
const slugField = z.string().regex(/^[a-z0-9][a-z0-9-]{1,78}$/);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const statusEnum = z.enum(['draft', 'published', 'scheduled']);

/** URL/string reference; binary data (data:/base64) is rejected. */
const mediaRef = z.string().trim().max(1000)
  .refine((v) => !v.toLowerCase().startsWith('data:'), 'Binary data is not allowed in JSON')
  .refine((v) => !v.includes(';base64'), 'Binary data is not allowed in JSON')
  .refine((v) => /^https?:\/\//.test(v) || /^[a-z0-9/_-]+$/i.test(v), 'Must be an https URL or a validated storage key');

export const importPreviewSchema = z.object({
  category: z.enum(IMPORT_CATEGORIES),
  items: z.array(z.record(z.string(), z.unknown())).min(1).max(500)
}).strict();

/* Per-category item schemas (strict). */

export const bannerItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  imageUrl: mediaRef,
  linkUrl: mediaRef.optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  status: z.enum(['draft', 'published']).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional()
}).strict();

export const quickAccessItemSchema = z.object({
  slug: slugField,
  titleEn: z.string().trim().min(1).max(60),
  titleBn: z.string().trim().min(1).max(60),
  subtitleEn: z.string().trim().max(120).optional(),
  subtitleBn: z.string().trim().max(120).optional(),
  icon: z.string().trim().min(1).max(80),
  route: z.string().trim().min(1).max(120),
  bgColor: hexColor.optional(),
  fgColor: hexColor.optional(),
  displayOrder: z.number().int().min(0).max(10000).optional(),
  status: statusEnum.optional(),
  scheduledAt: z.coerce.date().optional(),
  visibility: z.boolean().optional()
}).strict();

export const studyResourceItemSchema = z.object({
  slug: slugField,
  titleEn: z.string().trim().min(1).max(60),
  titleBn: z.string().trim().min(1).max(60),
  icon: z.string().trim().min(1).max(80),
  route: z.string().trim().min(1).max(120),
  bgColor: hexColor.optional(),
  fgColor: hexColor.optional(),
  materialTypes: z.array(z.enum(['book', 'note', 'video', 'past_question', 'subject_material'])).min(1).optional(),
  displayOrder: z.number().int().min(0).max(10000).optional(),
  status: statusEnum.optional(),
  scheduledAt: z.coerce.date().optional(),
  visibility: z.boolean().optional()
}).strict();

const hierarchyRefSchema = z.object({
  programId: objectIdString.optional(),
  regulationId: objectIdString.optional(),
  technologyId: objectIdString.optional(),
  semesterId: objectIdString.optional(),
  subjectId: objectIdString.optional(),
  chapterId: objectIdString.optional()
}).strict().optional();

export const upcomingExamItemSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(['chapter', 'subject', 'semester', 'model', 'previous']),
  hierarchyRefs: hierarchyRefSchema,
  durationSec: z.number().int().min(60).max(14400),
  marksPerQuestion: z.number().min(0.25).max(100),
  negativeMarkPercent: z.number().min(0).max(100).optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'closed']).optional(),
  scheduledAt: z.coerce.date().optional(),
  shuffle: z.boolean().optional()
}).strict();

export const adminNoticeItemSchema = z.object({
  title: z.string().trim().min(3).max(300),
  body: z.string().trim().min(3).max(5000),
  category: z.enum(['announcement', 'academic', 'exam', 'material', 'system']).optional(),
  status: z.enum(['draft', 'published']).optional(),
  pdfUrl: mediaRef.optional(),
  scheduledAt: z.coerce.date().optional()
}).strict();

export const homeConfigItemSchema = z.object({
  key: z.string().trim().min(2).max(60),
  visible: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(10000).optional(),
  maxItems: z.number().int().min(1).max(100).optional()
}).strict();

export const previewTokenSchema = z.object({ token: z.string().min(10).max(4096) }).strict();

export const exportQuerySchema = z.object({ category: z.enum(IMPORT_CATEGORIES) }).strict();

export const batchIdParam = z.object({ batchId: z.string().regex(/^[0-9a-fA-F]{24}$/) });

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();
