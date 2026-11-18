import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  phone: z.string().trim().regex(/^01[3-9]\d{8}$/).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional()
});

export const sessionIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/)
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(128),
  newPassword: z.string().min(8).max(128)
});
