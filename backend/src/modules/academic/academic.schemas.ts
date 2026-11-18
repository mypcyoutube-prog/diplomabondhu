import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const idParam = z.object({ id: objectId });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const programBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  nameBn: z.string().trim().max(200).optional(),
  code: z.string().trim().min(2).max(20),
  durationSemesters: z.number().int().min(1).max(12).default(8),
  isActive: z.boolean().default(true)
}).strict();

export const regulationBodySchema = z.object({
  programId: objectId,
  year: z.number().int().min(2000).max(2100),
  name: z.string().trim().min(2).max(200),
  status: z.enum(['draft', 'verification', 'testing', 'approved', 'published', 'retired']).default('draft'),
  officialRefs: z.array(z.object({
    title: z.string().trim().min(2).max(300),
    url: z.string().url().optional(),
    note: z.string().max(500).optional()
  })).default([])
}).strict();

export const instituteBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  nameBn: z.string().trim().max(200).optional(),
  code: z.string().trim().min(2).max(20),
  district: z.string().trim().max(100).optional(),
  type: z.string().trim().max(50).default('polytechnic')
}).strict();

export const sessionBodySchema = z.object({
  programId: objectId,
  regulationId: objectId,
  startYear: z.number().int().min(2000).max(2100),
  label: z.string().trim().min(2).max(50)
}).strict();

export const technologyBodySchema = z.object({
  programId: objectId,
  name: z.string().trim().min(2).max(200),
  nameBn: z.string().trim().max(200).optional(),
  code: z.string().trim().min(1).max(20)
}).strict();

export const semesterBodySchema = z.object({
  programId: objectId,
  regulationId: objectId,
  number: z.number().int().min(1).max(12),
  cgpaWeightPercent: z.number().min(0).max(100),
  isIndustrial: z.boolean().default(false)
}).strict();

export const subjectBodySchema = z.object({
  programId: objectId,
  regulationId: objectId,
  technologyId: objectId,
  semesterId: objectId,
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(200),
  nameBn: z.string().trim().max(200).optional(),
  credits: z.number().min(0.5).max(20),
  isElective: z.boolean().default(false)
}).strict();

export const chapterBodySchema = z.object({
  subjectId: objectId,
  number: z.number().int().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  nameBn: z.string().trim().max(200).optional()
}).strict();

export const listQuerySchema = paginationSchema.partial().extend({
  programId: objectId.optional(),
  regulationId: objectId.optional(),
  technologyId: objectId.optional(),
  semesterId: objectId.optional(),
  subjectId: objectId.optional(),
  q: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional()
}).strip();

export { idParam };
