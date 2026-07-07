import { Router } from 'express';
import * as focusSessionController from '../controllers/focusSession.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createFocusSessionSchema } from '../validators/focusSession.schema.js';

const router = Router();

router.use(protect);

router.get('/stats', focusSessionController.getFocusStats);
router.post('/', validate(createFocusSessionSchema), focusSessionController.createFocusSession);

export default router;
