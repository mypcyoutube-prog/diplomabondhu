import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const idParam = z.object({ id: objectId });

export const materialTypeSchema = z.enum(['book', 'note', 'video', 'past_question', 'subject_material']);

export const listMaterialsQuerySchema = z.object({
  type: materialTypeSchema.optional(),
  programId: objectId.optional(),
  regulationId: objectId.optional(),
  technologyId: objectId.optional(),
  semesterId: objectId.optional(),
  subjectId: objectId.optional(),
  chapterId: objectId.optional(),
  examYear: z.coerce.number().int().min(1990).max(2100).optional(),
  q: z.string().trim().min(1).max(200).optional(),
  sort: z.enum(['recent', 'oldest', 'popular', 'title']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

export const hierarchyRefsSchema = z.object({
  programId: objectId.optional(),
  regulationId: objectId.optional(),
  technologyId: objectId.optional(),
  semesterId: objectId.optional(),
  subjectId: objectId.optional(),
  chapterId: objectId.optional()
}).strict();

export const materialPayloadSchema = z.object({
  fileUrl: z.string().url().optional(),
  externalUrl: z.string().url().optional(),
  examYear: z.number().int().min(1990).max(2100).optional(),
  sizeBytes: z.number().int().min(0).optional(),
  pageCount: z.number().int().min(1).optional(),
  thumbnailUrl: z.string().url().max(1000).optional(),
  author: z.string().trim().max(200).optional(),
  edition: z.string().trim().max(60).optional(),
  durationSec: z.number().int().min(0).optional()
}).strict();

const materialBodyBase = z.object({
  type: materialTypeSchema,
  title: z.string().trim().min(2).max(300),
  titleBn: z.string().trim().max(300).optional(),
  description: z.string().max(5000).optional(),
  hierarchyRefs: hierarchyRefsSchema.default({}),
  payload: materialPayloadSchema.default({}),
  downloadAllowed: z.boolean().default(false),
  previewAllowed: z.boolean().default(true)
}).strict();

export const materialBodySchema = materialBodyBase.refine(
  (v) => Boolean(v.payload.fileUrl || v.payload.externalUrl),
  { message: 'Either fileUrl or externalUrl is required' }
);

export const updateMaterialSchema = materialBodyBase.partial().refine(
  (v) => {
    if (v.payload && (v.payload.fileUrl || v.payload.externalUrl)) return true;
    if (v.payload && !v.payload.fileUrl && !v.payload.externalUrl) return false;
    return Object.keys(v).length > 0;
  },
  { message: 'Nothing to update or payload would lose its URL' }
);

export const reportReasonCodeSchema = z.enum(['broken_link', 'wrong_info', 'wrong_file', 'duplicate', 'other']);

export const reportSchema = z.object({
  reasonCode: reportReasonCodeSchema.optional(),
  details: z.string().trim().max(1000).optional(),
  reason: z.string().trim().min(5).max(1000).optional()
}).strict().refine(
  (v) => Boolean(v.reasonCode || v.reason),
  { message: 'reasonCode or reason is required' }
);

export const resolveReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  note: z.string().trim().max(1000).optional()
}).strict();

export const listReportsQuerySchema = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']).default('open'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

export const adminListQuerySchema = z.object({
  type: materialTypeSchema.optional(),
  status: z.enum(['draft', 'published', 'unpublished']).optional(),
  q: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

export { objectId };
