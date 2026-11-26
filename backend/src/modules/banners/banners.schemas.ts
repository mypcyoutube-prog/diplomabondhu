import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const idParam = z.object({ id: objectId });

const httpUrl = z.string().trim().max(1000).refine(
  (v) => v === '' || /^https?:\/\/\S+$/.test(v),
  { message: 'Must be a valid http(s) URL or empty' }
);

export const bannerBodySchema = z.object({
  title: z.string().trim().max(120).default(''),
  imageUrl: httpUrl.refine((v) => v !== '', { message: 'imageUrl is required' }),
  linkUrl: httpUrl.default(''),
  ctaLabel: z.string().trim().max(40).default(''),
  priority: z.coerce.number().int().min(0).max(1000).default(0),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional()
}).strict();

export const updateBannerSchema = bannerBodySchema.partial();
