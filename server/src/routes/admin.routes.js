import { Router } from 'express';
import * as activityController from '../controllers/admin/activity.controller.js';
import * as analyticsController from '../controllers/admin/analytics.controller.js';
import * as dashboardController from '../controllers/admin/dashboard.controller.js';
import * as storageController from '../controllers/admin/storage.controller.js';
import * as uploadsController from '../controllers/admin/uploads.controller.js';
import * as usersController from '../controllers/admin/users.controller.js';
import * as videosController from '../controllers/admin/videos.controller.js';
import { protect, requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  idParamSchema,
  listActivityLogsSchema,
  listAdminVideosSchema,
  listUsersSchema,
  suspendUserSchema,
  updateAdminVideoSchema,
  updateUserSchema,
} from '../validators/admin.schema.js';

const router = Router();

router.use(protect, requireAdmin);

router.get('/dashboard', dashboardController.getDashboard);
router.get('/analytics', analyticsController.getAnalyticsOverview);
router.get('/activity-logs', validate(listActivityLogsSchema), activityController.listActivityLogs);

router.get('/users', validate(listUsersSchema), usersController.listUsers);
router.get('/users/:id', validate(idParamSchema), usersController.getUser);
router.patch('/users/:id', validate(updateUserSchema), usersController.updateUser);
router.post('/users/:id/suspend', validate(suspendUserSchema), usersController.suspendUser);
router.post('/users/:id/activate', validate(idParamSchema), usersController.activateUser);
router.delete('/users/:id', validate(idParamSchema), usersController.deleteUser);

router.get('/videos', validate(listAdminVideosSchema), videosController.listVideos);
router.get('/videos/:id', validate(idParamSchema), videosController.getVideo);
router.patch('/videos/:id', validate(updateAdminVideoSchema), videosController.updateVideo);
router.delete('/videos/:id', validate(idParamSchema), videosController.deleteVideo);
router.post('/videos/:id/restore', validate(idParamSchema), videosController.restoreVideo);
router.post('/videos/:id/reprocess', validate(idParamSchema), videosController.reprocessVideo);

router.get('/uploads/queue', uploadsController.getQueue);
router.post('/uploads/:id/retry', validate(idParamSchema), uploadsController.retryUpload);
router.post('/uploads/:id/cancel', validate(idParamSchema), uploadsController.cancelStuckJob);

router.get('/storage', storageController.getOverview);
router.get('/storage/orphans', storageController.scanOrphanFiles);
router.post('/storage/orphans/clean', storageController.cleanOrphanFiles);

export default router;
