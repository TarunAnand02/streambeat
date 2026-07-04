import { Router } from 'express';
import * as videoController from '../controllers/video.controller.js';
import { optionalAuth, protect } from '../middleware/auth.middleware.js';
import {
  suggestLimiter,
  uploadLimiter,
  urlImportLimiter,
  youtubeLimiter,
} from '../middleware/rateLimiters.js';
import { uploadCaption, uploadThumbnailOnly, uploadVideo } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  bulkActionSchema,
  createNoteSchema,
  createVideoSchema,
  importBatchSchema,
  importUrlSchema,
  importVideoSchema,
  listVideosSchema,
  noteIdSchema,
  searchSchema,
  suggestSchema,
  updateVideoSchema,
  videoIdSchema,
  youtubeChannelPreviewSchema,
  youtubePreviewSchema,
} from '../validators/video.schema.js';

const router = Router();

router.get('/', validate(listVideosSchema), videoController.listVideos);
router.get('/search', validate(searchSchema), videoController.searchVideos);
router.get(
  '/suggest',
  suggestLimiter,
  validate(suggestSchema),
  videoController.suggestVideos
);
router.get('/recommended', optionalAuth, videoController.getRecommended);
router.get(
  '/youtube-preview',
  protect,
  youtubeLimiter,
  validate(youtubePreviewSchema),
  videoController.previewYoutube
);
router.get(
  '/youtube-channel-preview',
  protect,
  youtubeLimiter,
  validate(youtubeChannelPreviewSchema),
  videoController.previewYoutubeChannel
);
router.post(
  '/import',
  protect,
  youtubeLimiter,
  validate(importVideoSchema),
  videoController.importYoutubeVideo
);
router.post(
  '/import-batch',
  protect,
  youtubeLimiter,
  validate(importBatchSchema),
  videoController.importYoutubeBatch
);
router.post(
  '/import-url',
  protect,
  urlImportLimiter,
  validate(importUrlSchema),
  videoController.importFromUrl
);

router.post(
  '/',
  protect,
  uploadLimiter,
  uploadVideo,
  validate(createVideoSchema),
  videoController.createVideo
);
router.post('/bulk', protect, validate(bulkActionSchema), videoController.bulkAction);

router.get('/:id', optionalAuth, validate(videoIdSchema), videoController.getVideo);
router.get('/:id/stream', validate(videoIdSchema), videoController.streamVideo);
router.get('/:id/thumbnail', validate(videoIdSchema), videoController.getThumbnail);
router.get('/:id/caption', validate(videoIdSchema), videoController.getCaption);
router.post('/:id/view', optionalAuth, validate(videoIdSchema), videoController.incrementView);
router.post('/:id/like', protect, validate(videoIdSchema), videoController.toggleLike);
router.post('/:id/notes', protect, validate(createNoteSchema), videoController.createNote);
router.get('/:id/notes', protect, validate(videoIdSchema), videoController.listNotes);
router.delete('/:id/notes/:noteId', protect, validate(noteIdSchema), videoController.deleteNote);
router.patch('/:id', protect, validate(updateVideoSchema), videoController.updateVideo);
router.patch(
  '/:id/thumbnail',
  protect,
  uploadLimiter,
  uploadThumbnailOnly,
  validate(videoIdSchema),
  videoController.updateThumbnail
);
router.patch(
  '/:id/caption',
  protect,
  uploadLimiter,
  uploadCaption,
  validate(videoIdSchema),
  videoController.updateCaption
);
router.delete('/:id', protect, validate(videoIdSchema), videoController.deleteVideo);

export default router;
