import { z } from 'zod';

const objectId = (label) => z.string().regex(/^[0-9a-fA-F]{24}$/, `Invalid ${label} id`);

export const createFocusSessionSchema = z.object({
  body: z.object({
    goal: z.string().trim().max(200).optional(),
    videoId: objectId('video').optional(),
    // Capped at 4 hours — generous for a single Study Mode sitting while
    // still rejecting obviously bogus client-reported durations.
    minutes: z.number().int().min(1).max(240),
  }),
  query: z.any(),
  params: z.any(),
});
