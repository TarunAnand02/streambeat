import { Router } from 'express';
import * as achievementController from '../controllers/achievement.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', protect, achievementController.getAchievements);

export default router;
