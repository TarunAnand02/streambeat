import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    label: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(40, 'Name must be at most 40 characters'),
  }),
  query: z.any(),
  params: z.any(),
});
