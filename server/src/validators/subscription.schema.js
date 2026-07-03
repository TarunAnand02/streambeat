import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const channelIdSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ channelId: objectId }),
});

export const feedSchema = z.object({
  body: z.any(),
  query: z.object({ page: z.coerce.number().int().min(1).optional() }),
  params: z.any(),
});
