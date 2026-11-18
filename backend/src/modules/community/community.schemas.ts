import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const idParam = z.object({ id: objectId });

export const listPostsQuerySchema = z.object({
  type: z.enum(['question', 'discussion']).optional(),
  tag: z.string().trim().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
}).strict();

export const postBodySchema = z.object({
  title: z.string().trim().min(5).max(300),
  body: z.string().trim().min(10).max(10000),
  type: z.enum(['question', 'discussion']).default('discussion'),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).default([])
}).strict();

export const postUpdateSchema = z.object({
  title: z.string().trim().min(5).max(300).optional(),
  body: z.string().trim().min(10).max(10000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  isAnswered: z.boolean().optional()
}).strict();

export const commentSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  parentId: objectId.optional()
}).strict();

export const reportSchema = z.object({
  targetType: z.enum(['post', 'comment']),
  targetId: objectId,
  reason: z.string().trim().min(5).max(500)
}).strict();

export const moderationActionSchema = z.object({
  action: z.enum(['hide', 'remove', 'restore']),
  reason: z.string().trim().max(500).optional()
}).strict();

export { objectId };
