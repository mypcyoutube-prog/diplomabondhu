import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const idParam = z.object({ id: objectId });

export const questionBodySchema = z.object({
  subjectId: objectId.optional(),
  chapterId: objectId.optional(),
  text: z.string().trim().min(3).max(2000),
  textBn: z.string().trim().max(2000).optional(),
  options: z.array(z.object({
    key: z.string().trim().min(1).max(4),
    text: z.string().trim().min(1).max(500)
  })).min(2).max(6),
  correctKey: z.string().trim().min(1).max(4),
  explanation: z.string().trim().max(3000).optional(),
  marks: z.number().min(0.25).max(100).default(1)
}).strict().refine(
  (v) => v.options.some((o) => o.key === v.correctKey),
  { message: 'correctKey must match one of the option keys' }
);

export const updateQuestionSchema = z.object({
  subjectId: objectId.optional(),
  chapterId: objectId.optional(),
  text: z.string().trim().min(3).max(2000).optional(),
  textBn: z.string().trim().max(2000).optional(),
  options: z.array(z.object({
    key: z.string().trim().min(1).max(4),
    text: z.string().trim().min(1).max(500)
  })).min(2).max(6).optional(),
  correctKey: z.string().trim().min(1).max(4).optional(),
  explanation: z.string().trim().max(3000).optional(),
  marks: z.number().min(0.25).max(100).optional()
}).strict();

export const examBodySchema = z.object({
  title: z.string().trim().min(3).max(300),
  description: z.string().max(5000).optional(),
  type: z.enum(['chapter', 'subject', 'semester', 'model', 'previous']),
  hierarchyRefs: z.object({
    programId: objectId.optional(),
    regulationId: objectId.optional(),
    technologyId: objectId.optional(),
    semesterId: objectId.optional(),
    subjectId: objectId.optional(),
    chapterId: objectId.optional()
  }).strict().default({}),
  questionIds: z.array(objectId).min(1).max(200),
  durationSec: z.number().int().min(60).max(14400),
  marksPerQuestion: z.number().min(0.25).max(100),
  negativeMarkPercent: z.number().min(0).max(100).default(0),
  shuffle: z.boolean().default(true),
  scheduledAt: z.coerce.date().optional()
}).strict();

export const updateExamSchema = examBodySchema.partial().extend({}).strict();

export const listExamsQuerySchema = z.object({
  type: z.enum(['chapter', 'subject', 'semester', 'model', 'previous']).optional(),
  subjectId: objectId.optional(),
  chapterId: objectId.optional(),
  semesterId: objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

export const answerBodySchema = z.object({
  questionId: objectId,
  selectedKey: z.string().trim().min(1).max(4)
}).strict();

export const adminListQuerySchema = z.object({
  status: z.enum(['draft', 'scheduled', 'published', 'closed']).optional(),
  type: z.enum(['chapter', 'subject', 'semester', 'model', 'previous']).optional(),
  q: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

export { objectId };
