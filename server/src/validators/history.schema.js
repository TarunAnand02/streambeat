import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid video id');

export const historyVideoIdSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ videoId: objectId }),
});
