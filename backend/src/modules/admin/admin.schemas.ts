import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const studentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'suspended', 'pending_deletion']).optional(),
  q: z.string().trim().max(100).optional()
}).strip();

export const idParamSchema = z.object({ id: objectId });

export const suspendSchema = z.object({
  reason: z.string().trim().min(3).max(500)
}).strict();

export const settingsUpdateSchema = z.object({
  branding: z.object({
    appName: z.string().trim().min(1).max(100).optional(),
    logoUrl: z.string().url().optional()
  }).optional(),
  homepageSections: z.array(z.object({
    key: z.string().trim().min(1).max(50),
    visible: z.boolean(),
    order: z.number().int().min(0).max(100),
    customizable: z.boolean().optional()
  })).optional(),
  resultDisplay: z.object({
    enabled: z.boolean(),
    examId: z.string().trim().max(120).default(''),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional()
  }).optional(),
  homeNoticeShowInTicker: z.boolean().optional(),
  homeNotice: z.object({
    text: z.string().trim().max(300).default(''),
    link: z.string().trim().max(1000).default(''),
    visible: z.boolean(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional()
  }).optional(),
  libraryCategories: z.object({
    book: z.boolean().optional(),
    note: z.boolean().optional(),
    video: z.boolean().optional(),
    subject_material: z.boolean().optional(),
    past_question: z.boolean().optional()
  }).optional(),
  featureFlags: z.record(z.string(), z.unknown()).optional(),
  maintenanceMode: z.boolean().optional(),
  supportInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    url: z.string().url().optional()
  }).optional(),
  legal: z.object({
    privacyPolicy: z.string().max(50000).optional(),
    terms: z.string().max(50000).optional()
  }).optional(),
  versionInfo: z.object({
    latestAppVersion: z.string().trim().max(20).optional(),
    notes: z.string().max(2000).optional()
  }).optional()
}).strict();
