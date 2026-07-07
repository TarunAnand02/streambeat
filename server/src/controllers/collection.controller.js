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

// A parent must be one of the requester's own collections — folders can't
// span across owners.
async function assertOwnedParent(parentId, userId) {
  if (!parentId) return;
  const parent = await Collection.findOne({ _id: parentId, owner: userId });
  if (!parent) throw new ApiError(400, 'That parent folder is not accessible to you');
}

// Finds this user's one auto-created Watch Later collection, creating it on
// first use — the client never needs to know its id upfront, just that
// "Watch Later" exists as a concept.
export async function findOrCreateWatchLater(userId) {
  let collection = await Collection.findOne({ owner: userId, isWatchLater: true });
  if (!collection) {
    collection = await Collection.create({
      name: 'Watch Later',
      owner: userId,
      visibility: 'private',
      isWatchLater: true,
    });
  }
  return collection;
}

export const getWatchLater = asyncHandler(async (req, res) => {
  const collection = await findOrCreateWatchLater(req.userId);
  const videos = await Video.find({ collections: collection._id })
    .sort({ createdAt: -1 })
    .populate('uploader', 'username avatarUrl');
  res.json({ collection, videos, role: 'owner' });
});

export const createCollection = asyncHandler(async (req, res) => {
  await assertOwnedParent(req.body.parent, req.userId);

  const collection = await Collection.create({
    name: req.body.name,
    description: req.body.description || '',
    owner: req.userId,
    parent: req.body.parent || null,
    visibility: req.body.visibility || 'private',
  });
  res.status(201).json({ collection });
});

// Shown on a user's channel page — only ever their top-level (no parent)
// public collections; a subfolder is reached by opening its parent, same as
// the owner's own view, and doesn't need its own separate listing here.
export const listPublicCollections = asyncHandler(async (req, res) => {
  const collections = await Collection.find({
    owner: req.params.userId,
    visibility: 'public',
    parent: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  const withCounts = await Promise.all(
    collections.map(async (collection) => {
      const videoCount = await Video.countDocuments({
        collections: collection._id,
        visibility: 'public',
      });
      return { ...collection, videoCount };
    })
  );

  res.json({ collections: withCounts });
});

export const listCollections = asyncHandler(async (req, res) => {
  const collections = await Collection.find({
    $or: [{ owner: req.userId }, { 'collaborators.user': req.userId }],
  })
    .sort({ createdAt: -1 })
    .lean();

  const withCounts = await Promise.all(
    collections.map(async (collection) => {
      const videoCount = await Video.countDocuments({ collections: collection._id });
      return { ...collection, videoCount, role: roleFor(collection, req.userId) };
    })
  );

  res.json({ collections: withCounts });
});

export const getCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id)
    .populate('collaborators.user', 'username avatarUrl')
    .populate('parent', 'name');
  if (!collection) throw new ApiError(404, 'Collection not found');
  const role = req.userId ? roleFor(collection, req.userId) : null;
  const isPublicView = !role && collection.visibility === 'public';
  if (!role && !isPublicView) {
    throw new ApiError(403, 'You do not have access to this collection');
  }

  // A public playlist shouldn't leak a private/unlisted video's existence to
  // someone who isn't its owner — same rule a channel page's video grid
  // already follows for non-owners.
  const videoFilter = isPublicView
    ? { collections: collection._id, visibility: 'public' }
    : { collections: collection._id };
  const videos = await Video.find(videoFilter)
    .sort({ createdAt: -1 })
    .populate('uploader', 'username avatarUrl');

  const orderIndex = new Map(collection.videoOrder.map((id, i) => [id.toString(), i]));
  videos.sort((a, b) => {
    const ai = orderIndex.has(a._id.toString()) ? orderIndex.get(a._id.toString()) : Infinity;
    const bi = orderIndex.has(b._id.toString()) ? orderIndex.get(b._id.toString()) : Infinity;
    return ai - bi;
  });

  // Subfolders — only the owner's own children are meaningful to show here
  // (a collaborator only has access to this one collection, not its tree).
  const subfolders =
    role === 'owner'
      ? await Collection.find({ parent: collection._id, owner: req.userId })
          .sort({ name: 1 })
          .lean()
      : [];

  res.json({ collection, videos, role, subfolders });
});

export const reorderCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw new ApiError(404, 'Collection not found');
  const role = roleFor(collection, req.userId);
  if (role !== 'owner' && role !== 'editor') {
    throw new ApiError(403, 'You do not have edit access to this collection');
  }

  const memberCount = await Video.countDocuments({
    _id: { $in: req.body.videoIds },
    collections: collection._id,
  });
  if (memberCount !== req.body.videoIds.length) {
    throw new ApiError(400, 'One or more videos are not in this collection');
  }

  collection.videoOrder = req.body.videoIds;
  await collection.save();

  res.json({ videoOrder: collection.videoOrder });
});

export const updateCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) throw new ApiError(404, 'Collection not found');
  if (collection.owner.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this collection');
  }

  if (req.body.name !== undefined) collection.name = req.body.name;
  if (req.body.description !== undefined) collection.description = req.body.description;
  if (req.body.visibility !== undefined) collection.visibility = req.body.visibility;

  if (req.body.parent !== undefined) {
    const newParentId = req.body.parent;
    if (newParentId) {
      if (newParentId === collection._id.toString()) {
        throw new ApiError(400, "A folder can't be its own parent");
      }
      await assertOwnedParent(newParentId, req.userId);

      // Walk up from the proposed parent to make sure `collection` isn't
      // one of its own ancestors — otherwise this move would create a loop.
      let cursor = await Collection.findById(newParentId).select('parent');
      while (cursor?.parent) {
        if (cursor.parent.toString() === collection._id.toString()) {
          throw new ApiError(400, "Can't move a folder inside its own subfolder");
        }
        cursor = await Collection.findById(cursor.parent).select('parent');
      }
    }
    collection.parent = newParentId || null;
  }

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
  // Reparent any subfolders up a level rather than deleting them too —
  // consistent with how deleting a collection never deletes its videos.
  await Collection.updateMany({ parent: collection._id }, { parent: collection.parent });
  await collection.deleteOne();

  res.status(204).send();
});
