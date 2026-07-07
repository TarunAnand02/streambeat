import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const createReportSchema = z.object({
  body: z.object({
    targetType: z.enum(['video', 'comment']),
    targetId: objectId,
    reason: z.enum(['spam', 'harassment', 'violence', 'copyright', 'nudity', 'misinformation', 'other']),
    details: z.string().trim().max(500).optional(),
  }),
  query: z.any(),
  params: z.any(),
});

export const listReportsSchema = z.object({
  body: z.any(),
  query: z.object({
    status: z.enum(['open', 'resolved', 'dismissed']).optional(),
  }),
  params: z.any(),
});

export const updateReportStatusSchema = z.object({
  body: z.object({
    status: z.enum(['open', 'resolved', 'dismissed']),
  }),
  query: z.any(),
  params: z.object({ id: objectId }),
});
