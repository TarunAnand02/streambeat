import { User } from '../models/User.js';
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
  const user = await User.findById(req.userId).select('autoRemoveCompletedFromContinueWatching');
  const autoRemove = user?.autoRemoveCompletedFromContinueWatching ?? true;

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
    .filter((e) => !autoRemove || !e.durationSeconds || e.positionSeconds < e.durationSeconds * 0.95)
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

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

function startOfDayUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

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

// Powers the Learning Dashboard — today/week/month totals, a 30-day category
// breakdown, a 7-day activity chart, and recently-completed videos, all
// derived from the same WatchHistory rows already collected for resume
// playback. Same positionSeconds-as-watch-time approximation used elsewhere.
export const getLearningStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfToday = startOfDayUTC(now);
  const since30Days = new Date(now.getTime() - MONTH_MS);

  const entries = await WatchHistory.find({ user: req.userId, watchedAt: { $gte: since30Days } })
    .populate({ path: 'video', select: 'category title' })
    .lean();
  const validEntries = entries.filter((e) => e.video);

  function bucketSince(sinceDate) {
    const inRange = validEntries.filter((e) => new Date(e.watchedAt) >= sinceDate);
    return {
      minutes: Math.round(inRange.reduce((sum, e) => sum + (e.positionSeconds || 0), 0) / 60),
      videosWatched: inRange.length,
    };
  }

  const today = bucketSince(startOfToday);
  const week = bucketSince(new Date(now.getTime() - WEEK_MS));
  const month = bucketSince(since30Days);

  const categoryMinutes = {};
  for (const e of validEntries) {
    const cat = e.video.category;
    categoryMinutes[cat] = (categoryMinutes[cat] || 0) + Math.round((e.positionSeconds || 0) / 60);
  }
  const categoryBreakdown = Object.entries(categoryMinutes)
    .map(([category, minutes]) => ({ category, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  const weeklyActivity = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(startOfToday.getTime() - i * DAY_MS);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const dayEntries = validEntries.filter((e) => {
      const t = new Date(e.watchedAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });
    weeklyActivity.push({
      date: dayStart.toISOString().slice(0, 10),
      minutes: Math.round(dayEntries.reduce((sum, e) => sum + (e.positionSeconds || 0), 0) / 60),
    });
  }

  const completedCount = await WatchHistory.countDocuments({
    user: req.userId,
    durationSeconds: { $gt: 0 },
    $expr: { $gte: ['$positionSeconds', { $multiply: ['$durationSeconds', 0.95] }] },
  });

  const recentEntries = await WatchHistory.find({ user: req.userId })
    .sort({ watchedAt: -1 })
    .limit(50)
    .populate({ path: 'video', select: 'title' })
    .lean();
  const recentlyCompleted = recentEntries
    .filter((e) => e.video && e.durationSeconds && e.positionSeconds >= e.durationSeconds * 0.95)
    .slice(0, 5)
    .map((e) => ({ videoId: e.video._id, title: e.video.title, watchedAt: e.watchedAt }));

  res.json({ today, week, month, categoryBreakdown, weeklyActivity, completedCount, recentlyCompleted });
});

export const clearHistory = asyncHandler(async (req, res) => {
  await WatchHistory.deleteMany({ user: req.userId });
  res.status(204).send();
});

export const removeHistoryEntry = asyncHandler(async (req, res) => {
  await WatchHistory.deleteOne({ user: req.userId, video: req.params.videoId });
  res.status(204).send();
});
