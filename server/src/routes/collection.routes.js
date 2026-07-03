import { Router } from 'express';
import * as collectionController from '../controllers/collection.controller.js';
import { protect } from '../middleware/auth.middleware.js';
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

router.use(protect);

router.post('/', validate(createCollectionSchema), collectionController.createCollection);
router.get('/', collectionController.listCollections);
router.get('/:id', validate(collectionIdSchema), collectionController.getCollection);
router.patch('/:id', validate(updateCollectionSchema), collectionController.updateCollection);
router.patch(
  '/:id/order',
  validate(reorderCollectionSchema),
  collectionController.reorderCollection
);
router.delete('/:id', validate(collectionIdSchema), collectionController.deleteCollection);
router.post(
  '/:id/collaborators',
  validate(addCollaboratorSchema),
  collectionController.addCollaborator
);
router.delete(
  '/:id/collaborators/:userId',
  validate(collaboratorIdSchema),
  collectionController.removeCollaborator
);

export default router;
