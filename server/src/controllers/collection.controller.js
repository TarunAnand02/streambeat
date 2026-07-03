import { Collection } from '../models/Collection.js';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function roleFor(collection, userId) {
  if (collection.owner.toString() === userId) return 'owner';
  const collaborator = collection.collaborators.find((c) => {
    const collaboratorId = c.user._id ? c.user._id.toString() : c.user.toString();
    return collaboratorId === userId;
  });
  return collaborator?.role || null;
}

export const createCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.create({
    name: req.body.name,
    description: req.body.description || '',
    owner: req.userId,
  });
  res.status(201).json({ collection });
});

export const listCollections = asyncHandler(async (req, res) => {
  const collections = await Collection.find({
    $or: [{ owner: req.userId }, { 'collaborators.user': req.userId }],
  }).sort({ createdAt: -1 });

  const withCounts = await Promise.all(
    collections.map(async (collection) => {
      const videoCount = await Video.countDocuments({ collections: collection._id });
      return { ...collection.toObject(), videoCount, role: roleFor(collection, req.userId) };
    })
  );

  res.json({ collections: withCounts });
});

export const getCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id).populate(
    'collaborators.user',
    'username avatarUrl'
  );
  if (!collection) throw new ApiError(404, 'Collection not found');
  const role = roleFor(collection, req.userId);
  if (!role) throw new ApiError(403, 'You do not have access to this collection');

  const videos = await Video.find({ collections: collection._id })
    .sort({ createdAt: -1 })
    .populate('uploader', 'username avatarUrl');

  res.json({ collection, videos, role });
});

export const updateCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw new ApiError(404, 'Collection not found');
  if (collection.owner.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this collection');
  }

  if (req.body.name !== undefined) collection.name = req.body.name;
  if (req.body.description !== undefined) collection.description = req.body.description;
  await collection.save();

  res.json({ collection });
});

export const addCollaborator = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw new ApiError(404, 'Collection not found');
  if (collection.owner.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this collection');
  }

  const targetUser = await User.findOne({ username: req.body.username });
  if (!targetUser) throw new ApiError(404, 'No user with that username');
  if (targetUser._id.toString() === req.userId) {
    throw new ApiError(400, "You can't add yourself as a collaborator");
  }

  const existing = collection.collaborators.find(
    (c) => c.user.toString() === targetUser._id.toString()
  );
  if (existing) {
    existing.role = req.body.role;
  } else {
    collection.collaborators.push({ user: targetUser._id, role: req.body.role });
  }
  await collection.save();
  await collection.populate('collaborators.user', 'username avatarUrl');

  res.json({ collection });
});

export const removeCollaborator = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw new ApiError(404, 'Collection not found');
  if (collection.owner.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this collection');
  }

  collection.collaborators = collection.collaborators.filter(
    (c) => c.user.toString() !== req.params.userId
  );
  await collection.save();

  res.status(204).send();
});

export const deleteCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw new ApiError(404, 'Collection not found');
  if (collection.owner.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this collection');
  }

  await Video.updateMany(
    { collections: collection._id },
    { $pull: { collections: collection._id } }
  );
  await collection.deleteOne();

  res.status(204).send();
});
