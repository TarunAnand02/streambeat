import mongoose from 'mongoose';
import { User } from '../../models/User.js';
import { Video } from '../../models/Video.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const ACTIVE_WINDOW_DAYS = 30;
const RECENT_UPLOADS_LIMIT = 10;

export const getDashboard = asyncHandler(async (req, res) => {
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    totalVideos,
    storageAgg,
    recentUploads,
    processingCount,
    failedCount,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastLoginAt: { $gte: activeSince } }),
    Video.countDocuments({ deletedAt: null }),
    Video.aggregate([
      { $match: { source: 'upload' } },
      {
        $group: {
          _id: null,
          totalBytes: { $sum: '$sizeBytes' },
          variantBytes: { $sum: { $sum: '$variants.sizeBytes' } },
        },
      },
    ]),
    Video.find({ deletedAt: null })
      .select('title uploader createdAt transcodeStatus')
      .populate('uploader', 'username')
      .sort({ createdAt: -1 })
      .limit(RECENT_UPLOADS_LIMIT)
      .lean(),
    Video.countDocuments({ transcodeStatus: 'processing' }),
    Video.countDocuments({ transcodeStatus: 'failed' }),
  ]);

  const totalStorageBytes = (storageAgg[0]?.totalBytes || 0) + (storageAgg[0]?.variantBytes || 0);

  res.json({
    totalUsers,
    activeUsers,
    activeWindowDays: ACTIVE_WINDOW_DAYS,
    totalVideos,
    totalStorageBytes,
    recentUploads,
    uploadQueue: { processing: processingCount, failed: failedCount },
    systemHealth: {
      dbConnected: mongoose.connection.readyState === 1,
      uptimeSeconds: Math.floor(process.uptime()),
    },
  });
});
