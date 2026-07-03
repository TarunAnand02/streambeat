import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/me', protect, userController.getMe);
router.patch('/me', protect, userController.updateMe);
router.get('/:id/channel', userController.getChannel);

export default router;
