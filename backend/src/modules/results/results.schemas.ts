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

export const parseUrlBodySchema = z.object({
  url: z.string().url('Invalid URL').max(2000).refine(
    (value) => value.startsWith('http://') || value.startsWith('https://'),
    'Only http(s) URLs are allowed'
  ),
  examId: z.string().max(120).regex(/^[A-Za-z0-9._-]*$/, 'Invalid exam id').optional(),
  title: z.string().max(200).optional()
});

export type ParseUrlBody = z.infer<typeof parseUrlBodySchema>;

export const driveKeyBodySchema = z
  .object({
    apiKey: z.string().trim().max(200).nullable().optional()
  })
  .strip();

export type DriveKeyBody = z.infer<typeof driveKeyBodySchema>;

export const driveFolderBodySchema = z
  .object({
    folderUrl: z.string().trim().min(10).max(2000)
  })
  .strip();

export type DriveFolderBody = z.infer<typeof driveFolderBodySchema>;

export const importBodySchema = z.object({
  batchId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid batch id'),
  examId: z.string().min(1).max(120).regex(/^[A-Za-z0-9._-]+$/, 'Invalid exam id'),
  title: z.string().min(1).max(200).optional()
});

export type ImportBody = z.infer<typeof importBodySchema>;
