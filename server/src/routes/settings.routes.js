import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { protect, requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { updateSettingsSchema } from '../validators/settings.schema.js';

const router = Router();

router.get('/public', settingsController.getPublicSettings);
router.get('/', protect, requireAdmin, settingsController.getSettings);
router.patch('/', protect, requireAdmin, validate(updateSettingsSchema), settingsController.updateSettings);

export default router;
