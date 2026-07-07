import { z } from 'zod';

const objectId = (label) => z.string().regex(/^[0-9a-fA-F]{24}$/, `Invalid ${label} id`);

export const listCommentsSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ videoId: objectId('video') }),
});

export const createCommentSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1, 'Comment cannot be empty').max(1000),
    parentId: objectId('comment').optional(),
  }),
  query: z.any(),
  params: z.object({ videoId: objectId('video') }),
});

export const commentIdSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: objectId('comment') }),
});
