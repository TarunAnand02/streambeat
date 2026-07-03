import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid article id');

export const createArticleSchema = z.object({
  body: z.object({
    category: z.string().trim().min(1, 'Category is required').max(60),
    question: z.string().trim().min(1, 'Question is required').max(200),
    answer: z.string().trim().min(1, 'Answer is required').max(3000),
    order: z.coerce.number().optional(),
  }),
  query: z.any(),
  params: z.any(),
});

export const updateArticleSchema = z.object({
  body: z.object({
    category: z.string().trim().min(1).max(60).optional(),
    question: z.string().trim().min(1).max(200).optional(),
    answer: z.string().trim().min(1).max(3000).optional(),
    order: z.coerce.number().optional(),
  }),
  query: z.any(),
  params: z.object({ id: objectId }),
});

export const articleIdSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: objectId }),
});
