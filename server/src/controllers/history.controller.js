import { WatchHistory } from '../models/WatchHistory.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listHistory = asyncHandler(async (req, res) => {
  const entries = await WatchHistory.find({ user: req.userId })
    .sort({ watchedAt: -1 })
    .limit(100)
    .populate({
      path: 'video',
      populate: { path: 'uploader', select: 'username avatarUrl' },
    })
    .lean();

  // A video may have been deleted since it was watched — drop those entries
  // from the response rather than erroring or showing a broken card.
  const videos = entries.filter((e) => e.video).map((e) => ({ ...e.video, watchedAt: e.watchedAt }));

  res.json({ videos });
});

// Videos genuinely in progress — started but not basically finished —
// most-recently-watched first. Used for the Home page's "Continue
// Watching" row.
export const getContinueWatching = asyncHandler(async (req, res) => {
  const entries = await WatchHistory.find({
    user: req.userId,
    positionSeconds: { $gt: 5 },
  })
    .sort({ watchedAt: -1 })
    .limit(30)
    .populate({
      path: 'video',
      populate: { path: 'uploader', select: 'username avatarUrl' },
    })
    .lean();

  const videos = entries
    .filter((e) => e.video && (e.video.visibility !== 'private' || e.video.uploader?._id.toString() === req.userId))
    .filter((e) => !e.durationSeconds || e.positionSeconds < e.durationSeconds * 0.95)
    .slice(0, 10)
    .map((e) => ({
      ...e.video,
      resumeAt: e.positionSeconds,
      progressPercent: e.durationSeconds
        ? Math.min(100, Math.round((e.positionSeconds / e.durationSeconds) * 100))
        : null,
    }));

  res.json({ videos });
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// positionSeconds is the last-known playback position per video, not a true
// watched-duration counter — this is an approximation (matches what's
// already collected for resume playback) rather than exact watch time.
export const getWeeklySummary = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - WEEK_MS);
  const entries = await WatchHistory.find({ user: req.userId, watchedAt: { $gte: since } })
    .populate({ path: 'video', select: 'category' })
    .lean();

  const validEntries = entries.filter((e) => e.video);
  const totalMinutes = Math.round(
    validEntries.reduce((sum, e) => sum + (e.positionSeconds || 0), 0) / 60
  );

  const categoryCounts = {};
  for (const e of validEntries) {
    const cat = e.video.category;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }
  const topCategory =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  res.json({
    totalMinutes,
    videosWatched: validEntries.length,
    topCategory,
  });
});

export const clearHistory = asyncHandler(async (req, res) => {
  await WatchHistory.deleteMany({ user: req.userId });
  res.status(204).send();
});

export const removeHistoryEntry = asyncHandler(async (req, res) => {
  await WatchHistory.deleteOne({ user: req.userId, video: req.params.videoId });
  res.status(204).send();
});
