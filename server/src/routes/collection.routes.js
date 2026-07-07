import { Router } from 'express';
import * as collectionController from '../controllers/collection.controller.js';
import { optionalAuth, protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  addCollaboratorSchema,
  collaboratorIdSchema,
  collectionIdSchema,
  createCollectionSchema,
  reorderCollectionSchema,
  updateCollectionSchema,
} from '../validators/collection.schema.js';

const router = Router();

router.post('/', protect, validate(createCollectionSchema), collectionController.createCollection);
router.get('/', protect, collectionController.listCollections);
router.get('/channel/:userId', collectionController.listPublicCollections);
// optionalAuth (not protect) — a public collection must be viewable by
// anyone, logged in or not, the same way a public video is.
router.get('/:id', optionalAuth, validate(collectionIdSchema), collectionController.getCollection);
router.patch('/:id', protect, validate(updateCollectionSchema), collectionController.updateCollection);
router.patch(
  '/:id/order',
  protect,
  validate(reorderCollectionSchema),
  collectionController.reorderCollection
);
router.delete('/:id', protect, validate(collectionIdSchema), collectionController.deleteCollection);
router.post(
  '/:id/collaborators',
  protect,
  validate(addCollaboratorSchema),
  collectionController.addCollaborator
);
router.delete(
  '/:id/collaborators/:userId',
  protect,
  validate(collaboratorIdSchema),
  collectionController.removeCollaborator
);

export default router;
