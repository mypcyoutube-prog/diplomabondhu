import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const idParam = z.object({ id: objectId });

export const preferencesSchema = z.object({
  categories: z.object({
    material: z.boolean().optional(),
    exam: z.boolean().optional(),
    academic: z.boolean().optional(),
    community: z.boolean().optional(),
    announcement: z.boolean().optional(),
    system: z.boolean().optional()
  }).strict(),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  }).strict().optional()
}).strict();

export const announcementBodySchema = z.object({
  title: z.string().trim().min(3).max(300),
  body: z.string().trim().min(3).max(5000),
  category: z.enum(['announcement', 'academic', 'exam', 'material', 'system']).default('announcement'),
  source: z.enum(['admin', 'bteb']).default('admin'),
  pdfUrl: z.string().url().max(1000).optional(),
  targeting: z.object({
    all: z.boolean().default(true),
    programIds: z.array(objectId).default([]),
    technologyIds: z.array(objectId).default([]),
    semesterIds: z.array(objectId).default([])
  }).strict().default({ all: true, programIds: [], technologyIds: [], semesterIds: [] }),
  scheduledAt: z.coerce.date().optional()
}).strict();

export const updateAnnouncementSchema = announcementBodySchema.partial();
