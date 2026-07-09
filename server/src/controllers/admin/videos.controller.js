import { Video } from '../../models/Video.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAdminAction } from '../../utils/auditLog.js';
import { transcodeVideo } from '../../utils/transcode.js';

const PAGE_SIZE = 25;

export const listVideos = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const filter = {};
  if (req.query.q) {
    const re = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.title = re;
  }
  if (req.query.uploader) filter.uploader = req.query.uploader;
  if (req.query.visibility) filter.visibility = req.query.visibility;
  if (req.query.status === 'deleted') filter.deletedAt = { $ne: null };
  else if (req.query.status !== 'all') filter.deletedAt = null;
  if (req.query.transcodeStatus) filter.transcodeStatus = req.query.transcodeStatus;

  const [videos, total] = await Promise.all([
    Video.find(filter)
      .select('title visibility transcodeStatus source sizeBytes views createdAt deletedAt uploader')
      .populate('uploader', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Video.countDocuments(filter),
  ]);

  res.json({ videos, page, total, pages: Math.ceil(total / PAGE_SIZE) });
});

export const getVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id).populate('uploader', 'username email');
  if (!video) throw new ApiError(404, 'Video not found');
  res.json({ video });
});

export const updateVideo = asyncHandler(async (req, res) => {
  const { title, description, category, visibility } = req.body;
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');

  const visibilityChanged = visibility !== undefined && visibility !== video.visibility;

  if (title !== undefined) video.title = title;
  if (description !== undefined) video.description = description;
  if (category !== undefined) video.category = category;
  if (visibility !== undefined) video.visibility = visibility;
  await video.save();

  res.json({ video });
  logAdminAction({
    actor: req.userId,
    action: visibilityChanged ? 'video_visibility_change' : 'video_edit',
    targetType: 'video',
    targetId: video._id,
    details: visibilityChanged
      ? `Changed '${video.title}' visibility to ${visibility}`
      : `Edited metadata for '${video.title}'`,
  });
});

// Soft-delete — hides the video everywhere (see the deletedAt filters added
// across the read paths) without touching its files, so Restore can bring
// it back exactly as it was.
export const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');

  video.deletedAt = new Date();
  await video.save();

  res.json({ video });
  logAdminAction({
    actor: req.userId,
    action: 'video_delete',
    targetType: 'video',
    targetId: video._id,
    details: `Soft-deleted '${video.title}'`,
  });
});

export const restoreVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');

  video.deletedAt = null;
  await video.save();

  res.json({ video });
  logAdminAction({
    actor: req.userId,
    action: 'video_restore',
    targetType: 'video',
    targetId: video._id,
    details: `Restored '${video.title}'`,
  });
});

export const reprocessVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.source !== 'upload') {
    throw new ApiError(400, 'Only native uploads can be reprocessed');
  }

  res.status(202).json({ message: 'Reprocessing started' });
  transcodeVideo(video._id).catch(() => {});
  logAdminAction({
    actor: req.userId,
    action: 'video_reprocess',
    targetType: 'video',
    targetId: video._id,
    details: `Triggered reprocessing for '${video.title}'`,
  });
});
