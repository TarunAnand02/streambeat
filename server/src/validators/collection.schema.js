import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid collection id');

export const createCollectionSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(60),
    description: z.string().trim().max(300).optional().default(''),
  }),
  query: z.any(),
  params: z.any(),
});

export const updateCollectionSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(60).optional(),
    description: z.string().trim().max(300).optional(),
  }),
  query: z.any(),
  params: z.object({ id: objectId }),
});

export const collectionIdSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: objectId }),
});

const userIdParam = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user id');

export const addCollaboratorSchema = z.object({
  body: z.object({
    username: z.string().trim().min(1, 'Username is required'),
    role: z.enum(['viewer', 'editor']),
  }),
  query: z.any(),
  params: z.object({ id: objectId }),
});

export const collaboratorIdSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: objectId, userId: userIdParam }),
});

const videoId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid video id');

export const reorderCollectionSchema = z.object({
  body: z.object({
    videoIds: z.array(videoId).min(1).max(500),
  }),
  query: z.any(),
  params: z.object({ id: objectId }),
});
