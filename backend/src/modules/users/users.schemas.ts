import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().regex(/^01[3-9]\d{8}$/).optional(),
  pictureUrl: z.string().url().max(500).optional(),
  roll: z.string().trim().min(1).max(32).optional(),
  registrationNo: z.string().trim().min(1).max(32).optional()
}).strict();

export const academicInfoSchema = z.object({
  instituteId: objectId.optional(),
  programId: objectId.optional(),
  regulationId: objectId.optional(),
  sessionId: objectId.optional(),
  technologyId: objectId.optional(),
  currentSemesterId: objectId.optional()
}).strict();

export const preferencesSchema = z.object({
  language: z.enum(['bn', 'en']).optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  notifications: z.record(z.string(), z.boolean()).optional()
}).strict();

export const fcmTokenSchema = z.object({
  token: z.string().min(10).max(4096)
}).strict();
