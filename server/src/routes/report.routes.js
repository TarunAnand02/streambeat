import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { protect, requireAdmin } from '../middleware/auth.middleware.js';
import { reportLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createReportSchema,
  listReportsSchema,
  updateReportStatusSchema,
} from '../validators/report.schema.js';

const router = Router();

router.post(
  '/',
  protect,
  reportLimiter,
  validate(createReportSchema),
  reportController.createReport
);
router.get('/', protect, requireAdmin, validate(listReportsSchema), reportController.listReports);
router.patch(
  '/:id',
  protect,
  requireAdmin,
  validate(updateReportStatusSchema),
  reportController.updateReportStatus
);

export default router;
