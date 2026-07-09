import { AuditLog } from '../../models/AuditLog.js';
import { Collection } from '../../models/Collection.js';
import { Comment } from '../../models/Comment.js';
import { FocusSession } from '../../models/FocusSession.js';
import { Note } from '../../models/Note.js';
import { Notification } from '../../models/Notification.js';
import { Report } from '../../models/Report.js';
import { Session } from '../../models/Session.js';
import { ShareLink } from '../../models/ShareLink.js';
import { Subscription } from '../../models/Subscription.js';
import { User } from '../../models/User.js';
import { Video } from '../../models/Video.js';
import { ViewEvent } from '../../models/ViewEvent.js';
import { WatchHistory } from '../../models/WatchHistory.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAdminAction } from '../../utils/auditLog.js';
import { deleteVideoFiles } from '../video.controller.js';

const PAGE_SIZE = 25;

export const listUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const filter = {};
  if (req.query.q) {
    const re = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ username: re }, { email: re }];
  }
  if (req.query.status === 'suspended') filter.suspended = true;
  if (req.query.status === 'active') filter.suspended = { $ne: true };
  if (req.query.status === 'admin') filter.isAdmin = true;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('username email isAdmin suspended suspendedAt suspendedReason lastLoginAt createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({ users, page, total, pages: Math.ceil(total / PAGE_SIZE) });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'username email isAdmin suspended suspendedAt suspendedReason lastLoginAt createdAt bio'
  );
  if (!user) throw new ApiError(404, 'User not found');

  const [videoCount, commentCount] = await Promise.all([
    Video.countDocuments({ uploader: user._id }),
    Comment.countDocuments({ user: user._id }),
  ]);

  res.json({ user, videoCount, commentCount });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { username, email, bio } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (username !== undefined) user.username = username;
  if (email !== undefined) user.email = email;
  if (bio !== undefined) user.bio = bio;
  await user.save();

  res.json({ user });
  logAdminAction({
    actor: req.userId,
    action: 'user_edit',
    targetType: 'user',
    targetId: user._id,
    details: `Edited user '${user.username}'`,
  });
});

export const suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user._id.toString() === req.userId) {
    throw new ApiError(400, "You can't suspend your own account");
  }

  user.suspended = true;
  user.suspendedAt = new Date();
  user.suspendedReason = req.body.reason || null;
  // Invalidate every outstanding refresh token/session immediately, rather
  // than relying solely on the suspended-check that already runs on every
  // authenticated request — matches the same revocation the app already
  // does on a password change.
  user.refreshTokenVersion += 1;
  await user.save();
  await Session.deleteMany({ user: user._id });

  res.json({ user });
  logAdminAction({
    actor: req.userId,
    action: 'user_suspend',
    targetType: 'user',
    targetId: user._id,
    details: `Suspended user '${user.username}'${req.body.reason ? `: ${req.body.reason}` : ''}`,
  });
});

export const activateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.suspended = false;
  user.suspendedAt = null;
  user.suspendedReason = null;
  await user.save();

  res.json({ user });
  logAdminAction({
    actor: req.userId,
    action: 'user_activate',
    targetType: 'user',
    targetId: user._id,
    details: `Reactivated user '${user.username}'`,
  });
});

// Irreversible — deletes the account and everything it owns (uploads and
// their files, comments, collections, subscriptions, watch history, etc).
// Content that merely references them elsewhere (e.g. a like on someone
// else's video) is pulled rather than cascaded further.
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user._id.toString() === req.userId) {
    throw new ApiError(400, "You can't delete your own account");
  }
  const userId = user._id;
  const username = user.username;

  const videos = await Video.find({ uploader: userId });
  for (const video of videos) {
    deleteVideoFiles(video);
  }
  const videoIds = videos.map((v) => v._id);

  await Promise.all([
    Note.deleteMany({ video: { $in: videoIds } }),
    ViewEvent.deleteMany({ video: { $in: videoIds } }),
    WatchHistory.deleteMany({ video: { $in: videoIds } }),
    Comment.deleteMany({ video: { $in: videoIds } }),
    Video.deleteMany({ uploader: userId }),
  ]);

  await Promise.all([
    Comment.deleteMany({ user: userId }),
    Collection.deleteMany({ owner: userId }),
    FocusSession.deleteMany({ user: userId }),
    Note.deleteMany({ user: userId }),
    Notification.deleteMany({ $or: [{ recipient: userId }, { actor: userId }] }),
    Report.deleteMany({ reporter: userId }),
    ShareLink.deleteMany({ owner: userId }),
    Session.deleteMany({ user: userId }),
    Subscription.deleteMany({ $or: [{ subscriber: userId }, { channel: userId }] }),
    WatchHistory.deleteMany({ user: userId }),
    Video.updateMany({ likes: userId }, { $pull: { likes: userId }, $inc: { likesCount: -1 } }),
  ]);

  await user.deleteOne();

  res.status(204).send();
  logAdminAction({
    actor: req.userId,
    action: 'user_delete',
    targetType: 'user',
    targetId: userId,
    details: `Deleted user '${username}' (${videos.length} videos removed)`,
  });
});
