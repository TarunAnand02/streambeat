import { Comment } from '../models/Comment.js';
import { Video } from '../models/Video.js';
import { ViewEvent } from '../models/ViewEvent.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const DAYS = 30;

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

async function viewsByDayFor(videoIds) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));

  const rows = await ViewEvent.aggregate([
    { $match: { video: { $in: videoIds }, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDate = new Map(rows.map((r) => [r._id, r.count]));

  const days = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = dateKey(d);
    days.push({ date: key, count: byDate.get(key) || 0 });
  }
  return days;
}

export const getChannelAnalytics = asyncHandler(async (req, res) => {
  const videos = await Video.find({ uploader: req.userId }).select(
    'title views likesCount category createdAt'
  );
  const videoIds = videos.map((v) => v._id);

  const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
  const totalLikes = videos.reduce((sum, v) => sum + v.likesCount, 0);
  const totalComments = videoIds.length
    ? await Comment.countDocuments({ video: { $in: videoIds } })
    : 0;

  const topVideos = [...videos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((v) => ({ _id: v._id, title: v.title, views: v.views, likesCount: v.likesCount }));

  const byCategory = new Map();
  for (const v of videos) {
    byCategory.set(v.category, (byCategory.get(v.category) || 0) + v.views);
  }
  const viewsByCategory = [...byCategory.entries()]
    .map(([category, views]) => ({ category, views }))
    .sort((a, b) => b.views - a.views);

  const viewsByDay = videoIds.length ? await viewsByDayFor(videoIds) : [];

  res.json({
    totalViews,
    totalLikes,
    totalVideos: videos.length,
    totalComments,
    topVideos,
    viewsByCategory,
    viewsByDay,
  });
});

export const getVideoAnalytics = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id).select(
    'title views likesCount uploader createdAt'
  );
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.uploader.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this video');
  }

  const commentsCount = await Comment.countDocuments({ video: video._id });
  const viewsByDay = await viewsByDayFor([video._id]);

  res.json({
    video: { _id: video._id, title: video.title, views: video.views, likesCount: video.likesCount },
    commentsCount,
    viewsByDay,
  });
});
