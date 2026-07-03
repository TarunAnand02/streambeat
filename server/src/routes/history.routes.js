import { Router } from 'express';
import * as historyController from '../controllers/history.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { historyVideoIdSchema } from '../validators/history.schema.js';

const router = Router();

router.use(protect);

router.get('/', historyController.listHistory);
router.delete('/', historyController.clearHistory);
router.delete('/:videoId', validate(historyVideoIdSchema), historyController.removeHistoryEntry);

export default router;
