import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { videoIdSchema } from '../validators/video.schema.js';

const router = Router();

router.use(protect);

router.get('/channel', analyticsController.getChannelAnalytics);
router.get('/videos/:id', validate(videoIdSchema), analyticsController.getVideoAnalytics);

export default router;
