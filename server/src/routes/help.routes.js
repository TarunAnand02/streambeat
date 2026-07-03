import { Router } from 'express';
import * as helpController from '../controllers/help.controller.js';
import { protect, requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  articleIdSchema,
  createArticleSchema,
  updateArticleSchema,
} from '../validators/help.schema.js';

const router = Router();

router.get('/', helpController.listArticles);
router.post('/', protect, requireAdmin, validate(createArticleSchema), helpController.createArticle);
router.patch(
  '/:id',
  protect,
  requireAdmin,
  validate(updateArticleSchema),
  helpController.updateArticle
);
router.delete('/:id', protect, requireAdmin, validate(articleIdSchema), helpController.deleteArticle);

export default router;
