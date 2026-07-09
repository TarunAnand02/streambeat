import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const idParamSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: objectId }),
});

export const listUsersSchema = z.object({
  body: z.any(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    q: z.string().trim().max(100).optional(),
    status: z.enum(['active', 'suspended', 'admin']).optional(),
  }),
  params: z.any(),
});

export const updateUserSchema = z.object({
  body: z
    .object({
      username: z.string().trim().min(3).max(30).optional(),
      email: z.string().trim().email().optional(),
      bio: z.string().trim().max(300).optional(),
    })
    .strict(),
  query: z.any(),
  params: z.object({ id: objectId }),
});

export const suspendUserSchema = z.object({
  body: z.object({ reason: z.string().trim().max(300).optional() }),
  query: z.any(),
  params: z.object({ id: objectId }),
});

export const listAdminVideosSchema = z.object({
  body: z.any(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    q: z.string().trim().max(100).optional(),
    uploader: objectId.optional(),
    visibility: z.enum(['public', 'unlisted', 'private']).optional(),
    status: z.enum(['active', 'deleted', 'all']).optional(),
    transcodeStatus: z.enum(['none', 'processing', 'ready', 'failed']).optional(),
  }),
  params: z.any(),
});

export const updateAdminVideoSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(100).optional(),
      description: z.string().trim().max(5000).optional(),
      category: z.string().trim().min(1).max(40).optional(),
      visibility: z.enum(['public', 'unlisted', 'private']).optional(),
    })
    .strict(),
  query: z.any(),
  params: z.object({ id: objectId }),
});

export const listActivityLogsSchema = z.object({
  body: z.any(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    action: z.string().trim().max(40).optional(),
    actor: objectId.optional(),
  }),
  params: z.any(),
});
