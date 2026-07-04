import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const PAGE_LIMIT = 30;

// Fire-and-forget helper used by the routes that actually trigger a
// notification (subscribe, comment, like) — never awaited from a hot path,
// and a failure here should never break the action that caused it.
export async function createNotification({ recipient, type, actor, video }) {
  if (recipient.toString() === actor.toString()) return; // never notify yourself
  try {
    await Notification.create({ recipient, type, actor, video });
  } catch {
    // best-effort — a notification failing to save shouldn't surface to the user
  }
}

export const listNotifications = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;

  const notifications = await Notification.find({ recipient: req.userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .populate('actor', 'username avatarUrl')
    .populate('video', 'title')
    .lean();

  const unreadCount = await Notification.countDocuments({ recipient: req.userId, read: false });

  res.json({ notifications, unreadCount, page });
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, recipient: req.userId });
  if (!notification) throw new ApiError(404, 'Notification not found');
  notification.read = true;
  await notification.save();
  res.status(204).send();
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.userId, read: false }, { read: true });
  res.status(204).send();
});
