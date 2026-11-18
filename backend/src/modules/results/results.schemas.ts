import { z } from 'zod';

export const checkQuerySchema = z.object({
  examId: z.string().min(1).max(120).regex(/^[A-Za-z0-9._-]+$/, 'Invalid exam id'),
  roll: z.string().regex(/^\d{6,10}$/, 'Roll must be 6-10 digits')
});

export type CheckQuery = z.infer<typeof checkQuerySchema>;

export const historyQuerySchema = z.object({
  roll: z.string().regex(/^\d{6,10}$/, 'Roll must be 6-10 digits')
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;

export const jobIdParamSchema = z.object({
  jobId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid job id')
});

export type JobIdParam = z.infer<typeof jobIdParamSchema>;

export const importBodySchema = z.object({
  batchId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid batch id'),
  examId: z.string().min(1).max(120).regex(/^[A-Za-z0-9._-]+$/, 'Invalid exam id'),
  title: z.string().min(1).max(200).optional()
});

export type ImportBody = z.infer<typeof importBodySchema>;
