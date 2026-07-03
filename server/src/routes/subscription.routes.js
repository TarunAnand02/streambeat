import { Router } from 'express';
import * as subscriptionController from '../controllers/subscription.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { channelIdSchema, feedSchema } from '../validators/subscription.schema.js';

const router = Router();

router.use(protect);

router.get('/', subscriptionController.listSubscriptions);
router.get('/feed', validate(feedSchema), subscriptionController.getFeed);
router.post('/:channelId', validate(channelIdSchema), subscriptionController.subscribe);
router.delete('/:channelId', validate(channelIdSchema), subscriptionController.unsubscribe);

export default router;
