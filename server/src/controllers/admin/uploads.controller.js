import { Video } from '../../models/Video.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAdminAction } from '../../utils/auditLog.js';
import { transcodeVideo } from '../../utils/transcode.js';

// Past this age, a 'processing' row is treated as stuck rather than
// legitimately still running — there's no live handle to the actual ffmpeg
// process from here (it's a detached fire-and-forget spawn, not tracked in
// a job table), so "stuck" is inferred purely from elapsed time.
const STUCK_THRESHOLD_MS = 30 * 60 * 1000;

export const getQueue = asyncHandler(async (req, res) => {
  const stuckBefore = new Date(Date.now() - STUCK_THRESHOLD_MS);

  const [processing, failed] = await Promise.all([
    Video.find({ transcodeStatus: 'processing' })
      .select('title uploader updatedAt createdAt')
      .populate('uploader', 'username')
      .sort({ updatedAt: 1 })
      .lean(),
    Video.find({ transcodeStatus: 'failed' })
      .select('title uploader updatedAt createdAt')
      .populate('uploader', 'username')
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  const withStuckFlag = processing.map((v) => ({ ...v, stuck: v.updatedAt < stuckBefore }));

  res.json({ processing: withStuckFlag, failed });
});

export const retryUpload = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.transcodeStatus !== 'failed') {
    throw new ApiError(400, 'Only failed uploads can be retried');
  }

  res.status(202).json({ message: 'Retry started' });
  transcodeVideo(video._id).catch(() => {});
  logAdminAction({
    actor: req.userId,
    action: 'video_reprocess',
    targetType: 'video',
    targetId: video._id,
    details: `Retried failed transcode for '${video.title}'`,
  });
});

// Can't actually kill the detached ffmpeg process (no job handle exists) —
// this just stops the row from showing as perpetually "processing" so an
// admin can retry it, same limitation disclosed for the queue view above.
export const cancelStuckJob = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.transcodeStatus !== 'processing') {
    throw new ApiError(400, 'Only in-progress uploads can be cancelled');
  }

  video.transcodeStatus = 'failed';
  await video.save();

  res.json({ video });
  logAdminAction({
    actor: req.userId,
    action: 'video_edit',
    targetType: 'video',
    targetId: video._id,
    details: `Marked stuck transcode job as failed for '${video.title}'`,
  });
});
