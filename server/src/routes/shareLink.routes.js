import { Router } from 'express';
import * as shareLinkController from '../controllers/shareLink.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { shareAccessLimiter } from '../middleware/rateLimiters.js';
import {
  accessShareLinkSchema,
  createShareLinkSchema,
  shareLinkIdSchema,
  videoIdParamSchema,
} from '../validators/shareLink.schema.js';

const router = Router();

router.post('/', protect, validate(createShareLinkSchema), shareLinkController.createShareLink);
router.get(
  '/video/:videoId',
  protect,
  validate(videoIdParamSchema),
  shareLinkController.listShareLinks
);
router.delete('/:id', protect, validate(shareLinkIdSchema), shareLinkController.revokeShareLink);
router.post(
  '/:token/access',
  shareAccessLimiter,
  validate(accessShareLinkSchema),
  shareLinkController.accessShareLink
);

export default router;
