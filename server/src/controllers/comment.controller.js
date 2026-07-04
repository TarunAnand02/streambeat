import { Comment } from '../models/Comment.js';
import { Video } from '../models/Video.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createNotification } from './notification.controller.js';

export const listComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ video: req.params.videoId })
    .sort({ createdAt: -1 })
    .populate('user', 'username avatarUrl');
  res.json({ comments });
});

export const createComment = asyncHandler(async (req, res) => {
  const comment = await Comment.create({
    video: req.params.videoId,
    user: req.userId,
    text: req.body.text,
  });
  const populated = await comment.populate('user', 'username avatarUrl');
  res.status(201).json({ comment: populated });

  const video = await Video.findById(req.params.videoId).select('uploader');
  if (video) {
    createNotification({
      recipient: video.uploader,
      type: 'comment',
      actor: req.userId,
      video: req.params.videoId,
    });
  }
});

export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (comment.user.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this comment');
  }
  await comment.deleteOne();
  res.status(204).send();
});
