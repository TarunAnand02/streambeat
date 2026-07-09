import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const PAGE_LIMIT = 30;
// Only these types get merged when several land the same day for the same
// video — comments/replies/achievements each carry unique content, so
// merging them would hide information rather than reduce clutter.
const GROUPABLE_TYPES = new Set(['like', 'subscribe']);
// Self-triggered types — the "actor" is the same person as the recipient by
// design (you unlocked an achievement, your own upload finished processing),
// so the usual "never notify yourself" guard only applies to social types.
const SELF_NOTIFY_TYPES = new Set(['achievement', 'transcode_complete']);

// Fire-and-forget helper used by the routes that actually trigger a
// notification (subscribe, comment, like, achievement, etc.) — never
// awaited from a hot path, and a failure here should never break the
// action that caused it.
export async function createNotification({ recipient, type, actor, video, meta }) {
  if (!SELF_NOTIFY_TYPES.has(type) && recipient.toString() === actor.toString()) return;
  try {
    await Notification.create({ recipient, type, actor, video, meta: meta ?? null });
  } catch {
    // best-effort — a notification failing to save shouldn't surface to the user
  }
}

function groupKey(n) {
  const day = new Date(n.createdAt).toISOString().slice(0, 10);
  const videoKey = n.video?._id?.toString() || n.video?.toString() || 'none';
  return `${n.type}:${videoKey}:${day}`;
}

// Collapses e.g. five separate "X liked your video" rows from the same day
// into one "X and 4 others liked your video" row — ids/actors are kept so
// the client can act (mark-read/delete) on the whole group at once.
function groupNotifications(notifications) {
  const groups = new Map();
  const ordered = [];
  for (const n of notifications) {
    if (!GROUPABLE_TYPES.has(n.type)) {
      ordered.push({ ...n, ids: [n._id], actors: [n.actor], groupCount: 1 });
      continue;
    }
    const key = groupKey(n);
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(n._id);
      existing.actors.push(n.actor);
      existing.groupCount += 1;
      if (!n.read) existing.read = false;
    } else {
      const group = { ...n, ids: [n._id], actors: [n.actor], groupCount: 1 };
      groups.set(key, group);
      ordered.push(group);
    }
  }
  return ordered;
}

export const listNotifications = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const { type } = req.query;

  const filter = { recipient: req.userId, deleted: false };
  if (type) filter.type = type;

  const raw = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_LIMIT)
    .limit(PAGE_LIMIT)
    .populate('actor', 'username avatarUrl')
    .populate('video', 'title')
    .lean();

  const notifications = groupNotifications(raw);
  const unreadCount = await Notification.countDocuments({
    recipient: req.userId,
    deleted: false,
    read: false,
  });

  // A full page of raw (pre-grouping) results means there's probably
  // another page — cheaper than a second count query, and grouping can only
  // ever shrink what's shown, never grow it past what the client asked for.
  res.json({ notifications, unreadCount, page, hasMore: raw.length === PAGE_LIMIT });
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, recipient: req.userId });
  if (!notification) throw new ApiError(404, 'Notification not found');
  notification.read = true;
  await notification.save();
  res.status(204).send();
});

// Marks every id in a group as read at once — used when a grouped row
// ("X and 4 others liked...") is clicked/opened.
export const markReadBulk = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { _id: { $in: req.body.ids }, recipient: req.userId },
    { read: true }
  );
  res.status(204).send();
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.userId, read: false }, { read: true });
  res.status(204).send();
});

export const deleteNotifications = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { _id: { $in: req.body.ids }, recipient: req.userId },
    { deleted: true }
  );
  res.status(204).send();
});

export const restoreNotifications = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { _id: { $in: req.body.ids }, recipient: req.userId },
    { deleted: false }
  );
  res.status(204).send();
});
