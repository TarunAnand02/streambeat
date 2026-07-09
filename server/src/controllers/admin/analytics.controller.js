import { User } from '../../models/User.js';
import { Video } from '../../models/Video.js';
import { WatchHistory } from '../../models/WatchHistory.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const DAYS = 30;

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function daySeriesSince(since) {
  const days = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    days.push(dateKey(d));
  }
  return days;
}

async function countByDay(Model, dateField, since) {
  const rows = await Model.aggregate([
    { $match: { [dateField]: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } }, count: { $sum: 1 } } },
  ]);
  const byDate = new Map(rows.map((r) => [r._id, r.count]));
  return daySeriesSince(since).map((date) => ({ date, count: byDate.get(date) || 0 }));
}

export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));

  const [newUsersByDay, uploadsByDay, mostViewed, watchTimeAgg, storageRows] = await Promise.all([
    countByDay(User, 'createdAt', since),
    countByDay(Video, 'createdAt', since),
    Video.find({ deletedAt: null })
      .select('title views uploader')
      .populate('uploader', 'username')
      .sort({ views: -1 })
      .limit(15)
      .lean(),
    // No per-view duration is tracked anywhere in the app (ViewEvent is
    // just a timestamp) — this sums each user's furthest-reached position
    // per video as an approximation of total engagement, not true
    // cumulative minutes watched.
    WatchHistory.aggregate([{ $group: { _id: null, totalSeconds: { $sum: '$positionSeconds' } } }]),
    Video.find({ source: 'upload' }).select('sizeBytes createdAt variants').sort({ createdAt: 1 }).lean(),
  ]);

  // Storage growth: cumulative bytes uploaded, bucketed by day — computed
  // retroactively from existing upload timestamps rather than a live
  // time-series, since no snapshot history of total storage is kept.
  const bytesByDate = new Map();
  for (const v of storageRows) {
    const variantBytes = (v.variants || []).reduce((s, variant) => s + (variant.sizeBytes || 0), 0);
    const bytes = (v.sizeBytes || 0) + variantBytes;
    const key = dateKey(new Date(v.createdAt));
    bytesByDate.set(key, (bytesByDate.get(key) || 0) + bytes);
  }
  let cumulative = 0;
  for (const [key, bytes] of [...bytesByDate.entries()].sort()) {
    if (new Date(key) < since) cumulative += bytes;
  }
  const storageGrowth = daySeriesSince(since).map((date) => {
    cumulative += bytesByDate.get(date) || 0;
    return { date, totalBytes: cumulative };
  });

  res.json({
    newUsersByDay,
    uploadsByDay,
    mostViewed,
    approxWatchTimeSeconds: watchTimeAgg[0]?.totalSeconds || 0,
    storageGrowth,
  });
});
