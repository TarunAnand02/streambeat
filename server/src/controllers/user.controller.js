import { Comment } from '../models/Comment.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const ACTIVITY_LIMIT = 15;

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isAdmin: user.isAdmin,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  });
});

export const getChannel = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const isOwner = req.userId === user._id.toString();
  // Only the owner sees their own unlisted/private videos on their channel
  // page — everyone else sees the same public-only view real platforms show.
  const videoFilter = isOwner ? { uploader: user._id } : { uploader: user._id, visibility: 'public' };
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

export const updateMe = asyncHandler(async (req, res) => {
  const { bio, avatarUrl } = req.body;
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: { ...(bio !== undefined && { bio }), ...(avatarUrl !== undefined && { avatarUrl }) } },
    { new: true, runValidators: true }
  );
  if (!user) throw new ApiError(404, 'User not found');
  res.json({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isAdmin: user.isAdmin,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  });
});
