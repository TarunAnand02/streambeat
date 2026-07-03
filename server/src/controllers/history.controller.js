import { WatchHistory } from '../models/WatchHistory.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listHistory = asyncHandler(async (req, res) => {
  const entries = await WatchHistory.find({ user: req.userId })
    .sort({ watchedAt: -1 })
    .limit(100)
    .populate({
      path: 'video',
      populate: { path: 'uploader', select: 'username avatarUrl' },
    });

  // A video may have been deleted since it was watched — drop those entries
  // from the response rather than erroring or showing a broken card.
  const videos = entries.filter((e) => e.video).map((e) => ({ ...e.video.toObject(), watchedAt: e.watchedAt }));

  res.json({ videos });
});

export const clearHistory = asyncHandler(async (req, res) => {
  await WatchHistory.deleteMany({ user: req.userId });
  res.status(204).send();
});

export const removeHistoryEntry = asyncHandler(async (req, res) => {
  await WatchHistory.deleteOne({ user: req.userId, video: req.params.videoId });
  res.status(204).send();
});
