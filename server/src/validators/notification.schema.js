import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid notification id');

export const notificationIdsSchema = z.object({
  body: z.object({
    ids: z.array(objectId).min(1).max(100),
  }),
  query: z.any(),
  params: z.any(),
});
