import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { categoryLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.middleware.js';
import { createCategorySchema } from '../validators/category.schema.js';

const router = Router();

router.get('/', categoryController.listCategories);
router.post('/', protect, categoryLimiter, validate(createCategorySchema), categoryController.createCategory);

export default router;
