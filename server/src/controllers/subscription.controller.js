import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createNotification } from './notification.controller.js';

export const subscribe = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (channelId === req.userId) {
    throw new ApiError(400, "You can't subscribe to your own channel");
  }
  const channel = await User.findById(channelId);
  if (!channel) throw new ApiError(404, 'Channel not found');

  await Subscription.findOneAndUpdate(
    { subscriber: req.userId, channel: channelId },
    { subscriber: req.userId, channel: channelId },
    { upsert: true }
  );

  createNotification({ recipient: channelId, type: 'subscribe', actor: req.userId });

  res.status(201).json({ subscribed: true });
});

export const unsubscribe = asyncHandler(async (req, res) => {
  await Subscription.deleteOne({ subscriber: req.userId, channel: req.params.channelId });
  res.status(204).send();
});

export const listSubscriptions = asyncHandler(async (req, res) => {
  const subs = await Subscription.find({ subscriber: req.userId })
    .sort({ createdAt: -1 })
    .populate('channel', 'username avatarUrl bio')
    .lean();

  const channels = await Promise.all(
    subs.map(async (sub) => ({
      ...sub.channel,
      subscriberCount: await Subscription.countDocuments({ channel: sub.channel._id }),
    }))
  );

  res.json({ channels });
});

export const getFeed = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = 24;

  const subs = await Subscription.find({ subscriber: req.userId }).select('channel').lean();
  const channelIds = subs.map((s) => s.channel);

  if (channelIds.length === 0) {
    return res.json({ videos: [], page, hasMore: false });
  }

  const videos = await Video.find({ uploader: { $in: channelIds }, visibility: 'public' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit + 1)
    .populate('uploader', 'username avatarUrl')
    .lean();

  res.json({ videos: videos.slice(0, limit), page, hasMore: videos.length > limit });
});
