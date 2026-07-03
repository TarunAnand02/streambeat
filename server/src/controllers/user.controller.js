import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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
    },
  });
});

export const getChannel = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const videos = await Video.find({ uploader: user._id }).sort({ createdAt: -1 });
  const subscriberCount = await Subscription.countDocuments({ channel: user._id });
  const isSubscribed = req.userId
    ? Boolean(await Subscription.exists({ subscriber: req.userId, channel: user._id }))
    : false;

  res.json({
    user: {
      id: user._id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    },
    videos,
    subscriberCount,
    isSubscribed,
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
    },
  });
});
