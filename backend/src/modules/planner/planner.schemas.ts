import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const idParam = z.object({ id: objectId });

export const routineSchema = z.object({
  slots: z.array(z.object({
    day: z.number().int().min(0).max(6),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    title: z.string().trim().min(1).max(200),
    kind: z.enum(['class', 'personal']).default('class'),
    room: z.string().trim().max(100).optional()
  }).strict()).max(200)
}).strict();

export const taskBodySchema = z.object({
  title: z.string().trim().min(2).max(300),
  description: z.string().max(5000).optional(),
  dueAt: z.coerce.date().optional(),
  reminderAt: z.coerce.date().optional()
}).strict();

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(2).max(300).optional(),
  description: z.string().max(5000).optional(),
  dueAt: z.coerce.date().optional(),
  reminderAt: z.coerce.date().optional(),
  status: z.enum(['todo', 'done']).optional()
}).strict();

export const goalBodySchema = z.object({
  title: z.string().trim().min(2).max(300),
  description: z.string().max(5000).optional(),
  targetDate: z.coerce.date().optional(),
  progressPercent: z.number().min(0).max(100).default(0)
}).strict();

export const goalUpdateSchema = z.object({
  title: z.string().trim().min(2).max(300).optional(),
  description: z.string().max(5000).optional(),
  targetDate: z.coerce.date().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  status: z.enum(['active', 'achieved', 'abandoned']).optional()
}).strict();

export const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
}).strict();

export { objectId };
