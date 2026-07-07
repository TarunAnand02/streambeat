import fs from 'fs';
import path from 'path';
import { Collection } from '../models/Collection.js';
import { Comment } from '../models/Comment.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { WatchHistory } from '../models/WatchHistory.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toPublicUser } from './auth.controller.js';
import { persistUploadedFile } from './video.controller.js';
import { AVATAR_STORAGE_DIR, assertAvatarSize } from '../middleware/upload.middleware.js';
import { deleteFileFromCloud, getSignedFileUrl } from '../utils/storage.js';

const ACTIVITY_LIMIT = 15;

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user: toPublicUser(user) });
});

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

// Gives users real control over their own recommendations instead of just
// feeding an opaque algorithm. $addToSet avoids growing the array on repeat
// clicks for the same video.
export const markNotInterested = asyncHandler(async (req, res) => {
  const { videoId } = req.body;
  if (!OBJECT_ID_RE.test(videoId || '')) throw new ApiError(400, 'Invalid video id');
  await User.findByIdAndUpdate(req.userId, {
    $addToSet: { notInterestedVideoIds: videoId },
  });
  res.status(204).send();
});

export const blockChannelRecommendations = asyncHandler(async (req, res) => {
  const { channelId } = req.body;
  if (!OBJECT_ID_RE.test(channelId || '')) throw new ApiError(400, 'Invalid channel id');
  if (channelId === req.userId) {
    throw new ApiError(400, "You can't block your own channel");
  }
  await User.findByIdAndUpdate(req.userId, {
    $addToSet: { blockedChannelIds: channelId },
  });
  res.status(204).send();
});

export const getChannel = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const isOwner = req.userId === user._id.toString();
  // Only the owner sees their own unlisted/private videos on their channel
  // page — everyone else sees the same public-only view real platforms show.
  const videoFilter = isOwner ? { uploader: user._id } : { uploader: user._id, visibility: 'public' };
  // Archiving only declutters the owner's own channel management view — an
  // archived-but-public video is still fully visible to everyone else, the
  // same way Gmail's Archive just leaves your own Inbox.
  if (isOwner && req.query.includeArchived !== 'true') {
    videoFilter.archived = { $ne: true };
  }
  const videos = await Video.find(videoFilter).sort({ createdAt: -1 });
  const subscriberCount = await Subscription.countDocuments({ channel: user._id });
  const isSubscribed = req.userId
    ? Boolean(await Subscription.exists({ subscriber: req.userId, channel: user._id }))
    : false;

  // A lightweight activity timeline built from data we already track
  // chronologically — uploads and comments — rather than a dedicated event
  // log. Likes aren't included since likesCount is a denormalized total with
  // no per-like timestamp to sort by.
  const recentComments = await Comment.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(ACTIVITY_LIMIT)
    .populate('video', 'title visibility');

  const activity = [
    ...videos.slice(0, ACTIVITY_LIMIT).map((v) => ({
      type: 'upload',
      createdAt: v.createdAt,
      video: { _id: v._id, title: v.title },
    })),
    ...recentComments
      // Skip comments whose video was since deleted, and — for anyone but
      // the profile owner — comments on videos that aren't public, so a
      // private/unlisted video's existence isn't leaked via someone else's
      // activity feed.
      .filter((c) => c.video && (isOwner || c.video.visibility === 'public'))
      .map((c) => ({
        type: 'comment',
        createdAt: c.createdAt,
        text: c.text,
        video: { _id: c.video._id, title: c.video.title },
      })),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, ACTIVITY_LIMIT);

  res.json({
    user: {
      id: user._id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
    },
    videos,
    subscriberCount,
    isSubscribed,
    activity,
  });
});

// Everything a user has created or accumulated, bundled as a single
// downloadable JSON file — deliberately excludes secrets (passwordHash,
// tokens) since toPublicUser already strips those.
export const exportUserData = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');

  const [videos, collections, comments, subscriptions, watchHistory] = await Promise.all([
    Video.find({ uploader: req.userId }).lean(),
    Collection.find({ owner: req.userId }).lean(),
    Comment.find({ user: req.userId }).lean(),
    Subscription.find({ subscriber: req.userId }).populate('channel', 'username').lean(),
    WatchHistory.find({ user: req.userId }).populate('video', 'title').lean(),
  ]);

  res.setHeader('Content-Disposition', 'attachment; filename="streambeat-data-export.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    profile: toPublicUser(user),
    videos,
    collections,
    comments,
    subscriptions: subscriptions.map((s) => ({
      channel: s.channel?.username ?? null,
      subscribedAt: s.createdAt,
    })),
    watchHistory: watchHistory.map((h) => ({
      video: h.video?.title ?? null,
      watchedAt: h.watchedAt,
      positionSeconds: h.positionSeconds,
    })),
  });
});

// Creator-side housekeeping: how much space your uploads use, which ones
// are biggest, and whether any are byte-for-byte duplicates of each other.
export const getStorageStats = asyncHandler(async (req, res) => {
  const videos = await Video.find({ uploader: req.userId, source: 'upload' })
    .select('title sizeBytes fileHash createdAt variants')
    .lean();

  const totalBytes = videos.reduce((sum, v) => {
    const variantBytes = (v.variants || []).reduce((s, variant) => s + (variant.sizeBytes || 0), 0);
    return sum + (v.sizeBytes || 0) + variantBytes;
  }, 0);

  const largestVideos = [...videos]
    .sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0))
    .slice(0, 10)
    .map((v) => ({ _id: v._id, title: v.title, sizeBytes: v.sizeBytes || 0 }));

  const hashGroups = {};
  for (const v of videos) {
    if (!v.fileHash) continue;
    (hashGroups[v.fileHash] ??= []).push({
      _id: v._id,
      title: v.title,
      sizeBytes: v.sizeBytes || 0,
      createdAt: v.createdAt,
    });
  }
  const duplicates = Object.values(hashGroups).filter((group) => group.length > 1);

  res.json({ totalBytes, videoCount: videos.length, largestVideos, duplicates });
});

export const updateMe = asyncHandler(async (req, res) => {
  // Avatar changes go exclusively through updateAvatar/deleteAvatar below,
  // which keep avatarUrl in sync with avatarFilename/avatarStorageProvider —
  // accepting an arbitrary avatarUrl here would let the two drift apart.
  const { bio, studyModeEnabled, weeklyGoalMinutes, autoRemoveCompletedFromContinueWatching } =
    req.body;
  if (
    weeklyGoalMinutes !== undefined &&
    weeklyGoalMinutes !== null &&
    (typeof weeklyGoalMinutes !== 'number' || weeklyGoalMinutes < 0 || weeklyGoalMinutes > 10080)
  ) {
    throw new ApiError(400, 'weeklyGoalMinutes must be a number between 0 and 10080, or null');
  }
  const user = await User.findByIdAndUpdate(
    req.userId,
    {
      $set: {
        ...(bio !== undefined && { bio }),
        ...(studyModeEnabled !== undefined && { studyModeEnabled }),
        ...(weeklyGoalMinutes !== undefined && { weeklyGoalMinutes }),
        ...(autoRemoveCompletedFromContinueWatching !== undefined && {
          autoRemoveCompletedFromContinueWatching,
        }),
      },
    },
    { new: true, runValidators: true, select: '+passwordHash' }
  );
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user: toPublicUser(user) });
});

// Serves the currently logged-in user's avatar image — <img> can't send an
// Authorization header, so this is deliberately a public route (mirrors
// getThumbnail's reasoning for videos).
export const getAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+avatarFilename +avatarStorageProvider');
  if (!user || !user.avatarFilename) {
    throw new ApiError(404, 'Avatar not found');
  }

  if (user.avatarStorageProvider === 'r2') {
    const url = await getSignedFileUrl(user.avatarFilename);
    return res.redirect(302, url);
  }

  const filePath = path.join(AVATAR_STORAGE_DIR, user.avatarFilename);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Avatar file missing on disk');
  }
  res.sendFile(filePath);
});

export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'An image file is required');
  if (!assertAvatarSize(req.file)) {
    throw new ApiError(400, 'Avatar exceeds the 5MB size limit');
  }

  const user = await User.findById(req.userId).select('+passwordHash +avatarFilename +avatarStorageProvider');
  if (!user) throw new ApiError(404, 'User not found');

  const oldFilename = user.avatarFilename;
  const oldStorageProvider = user.avatarStorageProvider;

  const storageProvider = await persistUploadedFile(req.file.path, req.file.filename, req.file.mimetype);

  user.avatarFilename = req.file.filename;
  user.avatarStorageProvider = storageProvider;
  // A path relative to the API, not an absolute URL — mirrors how video
  // thumbnail/stream/caption URLs work (the client builds the full URL from
  // its own configured API origin). Baking a server-computed absolute origin
  // in here instead would silently break every existing avatar the moment
  // that origin config is ever wrong, same as the CLIENT_ORIGIN issue found
  // earlier for email links.
  user.avatarUrl = `/users/${user._id}/avatar`;
  await user.save();

  if (oldFilename) {
    if (oldStorageProvider === 'r2') {
      deleteFileFromCloud(oldFilename);
    } else {
      fs.unlink(path.join(AVATAR_STORAGE_DIR, oldFilename), () => {});
    }
  }

  res.json({ user: toPublicUser(user) });
});

export const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('+passwordHash +avatarFilename +avatarStorageProvider');
  if (!user) throw new ApiError(404, 'User not found');

  const oldFilename = user.avatarFilename;
  const oldStorageProvider = user.avatarStorageProvider;

  user.avatarFilename = null;
  user.avatarUrl = null;
  await user.save();

  if (oldFilename) {
    if (oldStorageProvider === 'r2') {
      deleteFileFromCloud(oldFilename);
    } else {
      fs.unlink(path.join(AVATAR_STORAGE_DIR, oldFilename), () => {});
    }
  }

  res.json({ user: toPublicUser(user) });
});
