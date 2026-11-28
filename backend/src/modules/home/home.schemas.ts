import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
export const idParam = z.object({ id: objectId });
export { objectId };

export const slugField = z.string().regex(/^[a-z0-9][a-z0-9-]{1,78}$/);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const statusEnum = z.enum(['draft', 'published', 'scheduled']);

export const quickAccessBodySchema = z.object({
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

export const quickAccessUpdateSchema = quickAccessBodySchema.partial();

export const studyResourceBodySchema = z.object({
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

export const studyResourceUpdateSchema = studyResourceBodySchema.partial();

export const homeConfigBodySchema = z.object({
  key: z.string().trim().min(2).max(60),
  visible: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(10000).optional(),
  maxItems: z.number().int().min(1).max(100).optional()
}).strict();

export const homeConfigUpdateSchema = homeConfigBodySchema.partial().omit({ key: true });

export const welcomeSchema = z.object({
  messageEn: z.string().trim().max(300).optional(),
  messageBn: z.string().trim().max(300).optional(),
  visible: z.boolean().optional()
}).strict();

export const reorderSchema = z.object({
  items: z.array(z.object({ id: objectId, displayOrder: z.number().int().min(0).max(10000) })).min(1).max(500)
}).strict();

export const scheduleSchema = z.object({ scheduledAt: z.coerce.date() }).strict();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).optional(),
  q: z.string().trim().max(120).optional()
}).strict();
