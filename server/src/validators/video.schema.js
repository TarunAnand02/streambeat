import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid video id');
// Format-level check only — actual existence against the Category
// collection is checked in the controller (assertCategoryExists), since
// categories can be created at runtime and zod schemas here are synchronous.
const category = z.string().trim().min(1).max(40).optional().default('other');
const collectionId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid collection id');
const tagsArray = z.array(z.string().trim().min(1).max(30)).max(20).optional();
const visibility = z.enum(['public', 'unlisted', 'private']).optional().default('public');

export const createVideoSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title is required').max(100),
    description: z.string().trim().max(5000).optional().default(''),
    category,
    durationSeconds: z.coerce.number().positive().optional(),
    visibility,
  }),
  query: z.any(),
  params: z.any(),
});

export const importUrlSchema = z.object({
  body: z.object({
    url: z.string().trim().url('A valid URL is required'),
    title: z.string().trim().min(1, 'Title is required').max(100),
    description: z.string().trim().max(5000).optional().default(''),
    category,
  }),
  query: z.any(),
  params: z.any(),
});

export const updateVideoSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(5000).optional(),
    category: z.string().trim().min(1).max(40).optional(),
    tags: tagsArray,
    collections: z.array(collectionId).max(50).optional(),
    visibility: z.enum(['public', 'unlisted', 'private']).optional(),
  }),
  query: z.any(),
  params: z.object({ id: objectId }),
});

export const videoIdSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: objectId }),
});

export const updateProgressSchema = z.object({
  body: z.object({
    positionSeconds: z.coerce.number().min(0),
    durationSeconds: z.coerce.number().positive().optional(),
    playbackRate: z.coerce.number().min(0.25).max(3).optional(),
    resolution: z.string().max(20).optional(),
    captionsOn: z.coerce.boolean().optional(),
  }),
  query: z.any(),
  params: z.object({ id: objectId }),
});

const noteId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid note id');

export const createNoteSchema = z.object({
  body: z.object({
    timestampSeconds: z.coerce.number().min(0),
    text: z.string().trim().min(1, 'Note text is required').max(500),
  }),
  query: z.any(),
  params: z.object({ id: objectId }),
});

export const noteIdSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: objectId, noteId }),
});

export const listVideosSchema = z.object({
  body: z.any(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    category: z.string().trim().min(1).optional(),
    tags: z
      .string()
      .trim()
      .min(1)
      .optional()
      .transform((v) => (v ? v.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : undefined)),
    collectionId: collectionId.optional(),
    minDuration: z.coerce.number().min(0).optional(),
    maxDuration: z.coerce.number().min(0).optional(),
  }),
  params: z.any(),
});

export const searchSchema = z.object({
  body: z.any(),
  query: z.object({
    q: z.string().trim().min(1).max(200),
    category: z.string().trim().min(1).optional(),
    tags: z
      .string()
      .trim()
      .min(1)
      .optional()
      .transform((v) => (v ? v.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : undefined)),
    collectionId: collectionId.optional(),
    minDuration: z.coerce.number().min(0).optional(),
    maxDuration: z.coerce.number().min(0).optional(),
  }),
  params: z.any(),
});

export const suggestSchema = z.object({
  body: z.any(),
  query: z.object({ q: z.string().trim().min(1).max(200) }),
  params: z.any(),
});

export const youtubePreviewSchema = z.object({
  body: z.any(),
  query: z.object({ url: z.string().trim().min(1, 'A YouTube URL is required') }),
  params: z.any(),
});

export const importVideoSchema = z.object({
  body: z.object({
    youtubeVideoId: z.string().regex(/^[\w-]{11}$/, 'Invalid YouTube video id'),
    title: z.string().trim().min(1, 'Title is required').max(100),
    description: z.string().trim().max(5000).optional().default(''),
    category,
    thumbnailUrl: z.string().url().optional(),
    durationSeconds: z.coerce.number().positive().optional(),
  }),
  query: z.any(),
  params: z.any(),
});

export const youtubeChannelPreviewSchema = z.object({
  body: z.any(),
  query: z.object({
    url: z.string().trim().min(1, 'A YouTube channel URL is required'),
    pageToken: z.string().trim().optional(),
  }),
  params: z.any(),
});

export const bulkActionSchema = z.object({
  body: z
    .object({
      videoIds: z.array(objectId).min(1, 'Select at least one video').max(100),
      action: z.enum(['delete', 'addTags', 'addToCollection']),
      tags: tagsArray,
      collectionId: collectionId.optional(),
    })
    .refine((v) => v.action !== 'addTags' || (v.tags && v.tags.length > 0), {
      message: 'tags is required for the addTags action',
      path: ['tags'],
    })
    .refine((v) => v.action !== 'addToCollection' || v.collectionId, {
      message: 'collectionId is required for the addToCollection action',
      path: ['collectionId'],
    }),
  query: z.any(),
  params: z.any(),
});

export const importBatchSchema = z.object({
  body: z.object({
    category,
    videos: z
      .array(
        z.object({
          youtubeVideoId: z.string().regex(/^[\w-]{11}$/, 'Invalid YouTube video id'),
          title: z.string().trim().min(1).max(100),
          description: z.string().trim().max(5000).optional().default(''),
          thumbnailUrl: z.string().url().optional(),
          durationSeconds: z.coerce.number().positive().optional(),
        })
      )
      .min(1, 'Select at least one video')
      .max(50, 'Import at most 50 videos at a time'),
  }),
  query: z.any(),
  params: z.any(),
});
