import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { optionalAuth, protect } from '../middleware/auth.middleware.js';
import { uploadAvatar } from '../middleware/upload.middleware.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.get('/me', protect, userController.getMe);
router.patch('/me', protect, userController.updateMe);
router.put('/me/avatar', protect, uploadLimiter, uploadAvatar, userController.updateAvatar);
router.delete('/me/avatar', protect, userController.deleteAvatar);
router.get('/:id/channel', optionalAuth, userController.getChannel);
router.get('/:id/avatar', userController.getAvatar);

export default router;
