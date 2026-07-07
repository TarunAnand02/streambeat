import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { notificationIdsSchema } from '../validators/notification.schema.js';

const router = Router();

router.use(protect);

router.get('/', notificationController.listNotifications);
router.post('/read-all', notificationController.markAllRead);
router.post('/:id/read', notificationController.markRead);
router.post('/read-bulk', validate(notificationIdsSchema), notificationController.markReadBulk);
router.delete('/', validate(notificationIdsSchema), notificationController.deleteNotifications);
router.post('/restore', validate(notificationIdsSchema), notificationController.restoreNotifications);

export default router;
