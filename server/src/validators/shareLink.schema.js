import { z } from 'zod';

const objectId = (label) => z.string().regex(/^[0-9a-fA-F]{24}$/, `Invalid ${label} id`);

export const createShareLinkSchema = z.object({
  body: z.object({
    videoId: objectId('video'),
    password: z.string().min(1).max(100).optional(),
    // Capped at a year — an "expiring" link that never needs revisiting
    // defeats the point; omit entirely for a link that never expires.
    expiresInHours: z.number().int().min(1).max(8760).optional(),
  }),
  query: z.any(),
  params: z.any(),
});

export const videoIdParamSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ videoId: objectId('video') }),
});

export const shareLinkIdSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: objectId('share link') }),
});

export const accessShareLinkSchema = z.object({
  body: z.object({
    password: z.string().max(100).optional(),
  }),
  query: z.any(),
  params: z.object({ token: z.string().min(1).max(200) }),
});
