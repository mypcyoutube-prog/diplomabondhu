import { z } from 'zod';

const subjectRow = z.object({
  code: z.string().trim().min(1).max(12),
  name: z.string().trim().min(1).max(200),
  credit: z.number().min(0).max(20).nullable().optional(),
  theoryMaxMarks: z.number().min(0).max(1000).nullable().optional(),
  practicalMaxMarks: z.number().min(0).max(1000).nullable().optional(),
  ppwTheory: z.number().min(0).max(100).nullable().optional(),
  ppwPractical: z.number().min(0).max(100).nullable().optional(),
  type: z.enum(['theory', 'practical', 'theory_practical']).nullable().optional()
});

const semesterRow = z.object({
  semester: z.number().int().min(1).max(12),
  group: z.object({
    code: z.string().trim().min(1).max(12),
    label: z.string().trim().max(120)
  }).nullable().optional(),
  subjects: z.array(subjectRow).max(60),
  optionalSubjects: z.array(subjectRow).max(60).optional()
});

const technologyRow = z.object({
  slug: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(150),
  semesters: z.array(semesterRow).min(1).max(12)
});

export const catalogQuerySchema = z.object({
  regulation: z.coerce.number().int().min(2000).max(2100).optional(),
  technologySlug: z.string().trim().min(1).max(120).optional(),
  semester: z.coerce.number().int().min(1).max(12).optional()
}).strict();

export const subjectListQuerySchema = catalogQuerySchema.extend({
  q: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100)
}).strict();

export const namesQuerySchema = z.object({
  codes: z.string().trim().min(1).max(1000)
}).strict();

export const catalogImportBodySchema = z.object({
  source: z.string().trim().max(200).optional(),
  regulation: z.number().int().min(2000).max(2100),
  technologies: z.array(technologyRow).min(1).max(100)
}).strict();

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type SubjectListQuery = z.infer<typeof subjectListQuerySchema>;
export type NamesQuery = z.infer<typeof namesQuerySchema>;
export type CatalogImportBody = z.infer<typeof catalogImportBodySchema>;
