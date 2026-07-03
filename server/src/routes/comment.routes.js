import { Router } from 'express';
import * as commentController from '../controllers/comment.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  commentIdSchema,
  createCommentSchema,
  listCommentsSchema,
} from '../validators/comment.schema.js';

const router = Router();

router.get(
  '/video/:videoId',
  validate(listCommentsSchema),
  commentController.listComments
);
router.post(
  '/video/:videoId',
  protect,
  validate(createCommentSchema),
  commentController.createComment
);
router.delete('/:id', protect, validate(commentIdSchema), commentController.deleteComment);

export default router;
