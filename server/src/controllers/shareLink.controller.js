import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { ShareLink } from '../models/ShareLink.js';
import { Subscription } from '../models/Subscription.js';
import { Video } from '../models/Video.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const SALT_ROUNDS = 12;
const HOUR_MS = 60 * 60 * 1000;

async function assertOwnsVideo(videoId, userId) {
  const video = await Video.findById(videoId).select('uploader');
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.uploader.toString() !== userId) {
    throw new ApiError(403, 'You do not own this video');
  }
  return video;
}

export const createShareLink = asyncHandler(async (req, res) => {
  const { videoId, password, expiresInHours } = req.body;
  await assertOwnsVideo(videoId, req.userId);

  const token = crypto.randomBytes(24).toString('base64url');
  const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
  const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * HOUR_MS) : null;

  const link = await ShareLink.create({
    video: videoId,
    owner: req.userId,
    token,
    passwordHash,
    expiresAt,
  });

  res.status(201).json({
    id: link._id,
    token: link.token,
    hasPassword: Boolean(passwordHash),
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
  });
});

export const listShareLinks = asyncHandler(async (req, res) => {
  await assertOwnsVideo(req.params.videoId, req.userId);

  const links = await ShareLink.find({ video: req.params.videoId, owner: req.userId })
    .select('token passwordHash expiresAt createdAt')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    links: links.map((l) => ({
      id: l._id,
      token: l.token,
      hasPassword: Boolean(l.passwordHash),
      expiresAt: l.expiresAt,
      createdAt: l.createdAt,
      expired: Boolean(l.expiresAt && l.expiresAt < new Date()),
    })),
  });
});

export const revokeShareLink = asyncHandler(async (req, res) => {
  const link = await ShareLink.findById(req.params.id);
  if (!link) throw new ApiError(404, 'Share link not found');
  if (link.owner.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this share link');
  }
  await link.deleteOne();
  res.status(204).send();
});

// Public — anyone holding the link can call this, no auth required. The
// token itself is the primary credential (24 random bytes, unguessable);
// a password, if the owner set one, is checked once here rather than on
// every subsequent stream/thumbnail/caption byte request.
export const accessShareLink = asyncHandler(async (req, res) => {
  const link = await ShareLink.findOne({ token: req.params.token }).select('+passwordHash');
  if (!link) throw new ApiError(404, 'This share link is invalid');
  if (link.expiresAt && link.expiresAt < new Date()) {
    throw new ApiError(410, 'This share link has expired');
  }

  if (link.passwordHash) {
    if (!req.body.password) {
      return res.status(401).json({ requiresPassword: true });
    }
    const valid = await bcrypt.compare(req.body.password, link.passwordHash);
    if (!valid) {
      return res.status(401).json({ requiresPassword: true, message: 'Incorrect password' });
    }
  }

  const video = await Video.findById(link.video).populate('uploader', 'username avatarUrl');
  if (!video || video.deletedAt) throw new ApiError(404, 'The video behind this link no longer exists');

  const subscriberCount = await Subscription.countDocuments({ channel: video.uploader._id });

  res.json({ video, subscriberCount });
});
