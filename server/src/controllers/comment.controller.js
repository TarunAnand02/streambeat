import { Comment } from '../models/Comment.js';
import { Video } from '../models/Video.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createNotification } from './notification.controller.js';
import { assertViewable } from './video.controller.js';

export const listComments = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.videoId).select('uploader visibility');
  if (!video) throw new ApiError(404, 'Video not found');
  assertViewable(video, req.userId);

  const comments = await Comment.find({ video: req.params.videoId })
    .sort({ createdAt: -1 })
    .populate('user', 'username avatarUrl');
  res.json({ comments });
});

export const createComment = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.videoId).select('uploader visibility');
  if (!video) throw new ApiError(404, 'Video not found');
  assertViewable(video, req.userId);

  let parent = null;
  if (req.body.parentId) {
    parent = await Comment.findOne({ _id: req.body.parentId, video: req.params.videoId });
    if (!parent) throw new ApiError(404, 'Comment being replied to was not found');
    if (parent.parent) {
      // Replies are one level deep — a reply-to-a-reply attaches to the
      // original top-level comment instead of building a deeper chain.
      parent = await Comment.findById(parent.parent);
    }
  }

  const comment = await Comment.create({
    video: req.params.videoId,
    user: req.userId,
    text: req.body.text,
    parent: parent?._id ?? null,
  });
  const populated = await comment.populate('user', 'username avatarUrl');
  res.status(201).json({ comment: populated });

  if (parent) {
    createNotification({
      recipient: parent.user,
      type: 'reply',
      actor: req.userId,
      video: req.params.videoId,
    });
  } else {
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

  const isCommentOwner = comment.user.toString() === req.userId;
  if (!isCommentOwner) {
    // The video's uploader can also moderate comments on their own content —
    // otherwise a creator has no way to remove harassment/spam left on their
    // videos.
    const video = await Video.findById(comment.video).select('uploader');
    const isVideoOwner = video && video.uploader.toString() === req.userId;
    if (!isVideoOwner) {
      throw new ApiError(403, 'You do not own this comment');
    }
  }

  await Comment.deleteMany({ parent: comment._id });
  await comment.deleteOne();
  res.status(204).send();
});
