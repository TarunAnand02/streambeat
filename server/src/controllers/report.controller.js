import { Comment } from '../models/Comment.js';
import { Report } from '../models/Report.js';
import { Video } from '../models/Video.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, details } = req.body;

  const Model = targetType === 'video' ? Video : Comment;
  const exists = await Model.exists({ _id: targetId });
  if (!exists) throw new ApiError(404, `That ${targetType} no longer exists`);

  const report = await Report.create({
    reporter: req.userId,
    targetType,
    targetId,
    reason,
    details: details || '',
  });
  res.status(201).json({ report });
});

// Admin-only — see middleware/auth.middleware.js's requireAdmin.
export const listReports = asyncHandler(async (req, res) => {
  const status = req.query.status || 'open';
  const reports = await Report.find({ status })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('reporter', 'username')
    .lean();

  // Resolve each report's target for display — best-effort, since the
  // target may have since been deleted (the report itself still stands).
  const videoIds = reports.filter((r) => r.targetType === 'video').map((r) => r.targetId);
  const commentIds = reports.filter((r) => r.targetType === 'comment').map((r) => r.targetId);
  const [videos, comments] = await Promise.all([
    Video.find({ _id: { $in: videoIds } }).select('title').lean(),
    Comment.find({ _id: { $in: commentIds } }).select('text video').lean(),
  ]);
  const videoById = new Map(videos.map((v) => [v._id.toString(), v]));
  const commentById = new Map(comments.map((c) => [c._id.toString(), c]));

  const enriched = reports.map((r) => ({
    ...r,
    target:
      r.targetType === 'video'
        ? videoById.get(r.targetId.toString()) || null
        : commentById.get(r.targetId.toString()) || null,
  }));

  res.json({ reports: enriched });
});

export const updateReportStatus = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  if (!report) throw new ApiError(404, 'Report not found');
  res.json({ report });
});
