import fs from 'fs';
import path from 'path';
import { User } from '../../models/User.js';
import { Video } from '../../models/Video.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAdminAction } from '../../utils/auditLog.js';
import {
  AVATAR_STORAGE_DIR,
  CAPTION_STORAGE_DIR,
  THUMBNAIL_STORAGE_DIR,
  VIDEO_STORAGE_DIR,
} from '../../middleware/upload.middleware.js';

export const getOverview = asyncHandler(async (req, res) => {
  const videos = await Video.find({ source: 'upload' })
    .select('title sizeBytes fileHash createdAt variants uploader')
    .populate('uploader', 'username')
    .lean();

  const totalBytes = videos.reduce((sum, v) => {
    const variantBytes = (v.variants || []).reduce((s, variant) => s + (variant.sizeBytes || 0), 0);
    return sum + (v.sizeBytes || 0) + variantBytes;
  }, 0);

  const largestVideos = [...videos]
    .sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0))
    .slice(0, 15)
    .map((v) => ({
      _id: v._id,
      title: v.title,
      sizeBytes: v.sizeBytes || 0,
      uploader: v.uploader ? { _id: v.uploader._id, username: v.uploader.username } : null,
    }));

  const byUploader = new Map();
  for (const v of videos) {
    if (!v.uploader) continue;
    const key = v.uploader._id.toString();
    const variantBytes = (v.variants || []).reduce((s, variant) => s + (variant.sizeBytes || 0), 0);
    const bytes = (v.sizeBytes || 0) + variantBytes;
    const entry = byUploader.get(key) || { username: v.uploader.username, bytes: 0, videoCount: 0 };
    entry.bytes += bytes;
    entry.videoCount += 1;
    byUploader.set(key, entry);
  }
  const topConsumers = [...byUploader.entries()]
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 15);

  const hashGroups = {};
  for (const v of videos) {
    if (!v.fileHash) continue;
    (hashGroups[v.fileHash] ??= []).push({ _id: v._id, title: v.title, sizeBytes: v.sizeBytes || 0 });
  }
  const duplicateGroups = Object.values(hashGroups).filter((g) => g.length > 1).length;

  res.json({ totalBytes, videoCount: videos.length, largestVideos, topConsumers, duplicateGroups });
});

// Local-disk-only — files kept in R2 aren't scanned here (no bulk "list
// objects" call is otherwise made anywhere in the app, so there's no
// existing pattern to lean on, and most deployments only use R2 for the
// bulk of storage while local stays small/dev-only).
async function scanLocalOrphans() {
  const [videos, users] = await Promise.all([
    Video.find({ storageProvider: 'local' })
      .select('filename thumbnailFilename captionFilename variants')
      .lean(),
    User.find({ avatarStorageProvider: 'local' }).select('avatarFilename').lean(),
  ]);

  const knownVideoFilenames = new Set();
  const knownThumbnailFilenames = new Set();
  const knownCaptionFilenames = new Set();
  for (const v of videos) {
    if (v.filename) knownVideoFilenames.add(v.filename);
    if (v.thumbnailFilename) knownThumbnailFilenames.add(v.thumbnailFilename);
    if (v.captionFilename) knownCaptionFilenames.add(v.captionFilename);
    for (const variant of v.variants || []) {
      if (variant.storageProvider === 'local') knownVideoFilenames.add(variant.filename);
    }
  }
  const knownAvatarFilenames = new Set(users.map((u) => u.avatarFilename).filter(Boolean));

  // Never touch anything written in the last hour — an in-flight upload
  // writes its file before the DB record exists, so a file that young could
  // just be mid-upload rather than truly orphaned.
  const safeCutoff = Date.now() - 60 * 60 * 1000;

  async function scanDir(dir, known) {
    let entries;
    try {
      entries = await fs.promises.readdir(dir);
    } catch {
      return [];
    }
    const orphans = [];
    for (const filename of entries) {
      if (known.has(filename) || filename.startsWith('.')) continue;
      const filePath = path.join(dir, filename);
      const stat = await fs.promises.stat(filePath).catch(() => null);
      if (!stat || !stat.isFile() || stat.mtimeMs > safeCutoff) continue;
      orphans.push({ filename, dir, sizeBytes: stat.size });
    }
    return orphans;
  }

  const [videoOrphans, thumbOrphans, captionOrphans, avatarOrphans] = await Promise.all([
    scanDir(VIDEO_STORAGE_DIR, knownVideoFilenames),
    scanDir(THUMBNAIL_STORAGE_DIR, knownThumbnailFilenames),
    scanDir(CAPTION_STORAGE_DIR, knownCaptionFilenames),
    scanDir(AVATAR_STORAGE_DIR, knownAvatarFilenames),
  ]);

  return [...videoOrphans, ...thumbOrphans, ...captionOrphans, ...avatarOrphans];
}

// "Clean Temporary Files" and "Remove Orphan Files" from the spec both
// reduce to the same underlying mechanism in this codebase — there's no
// separate staging/temp directory (multer writes uploads directly to their
// final destination), so a "temp" leftover and an "orphan" file are the
// same thing here: a file on disk with no DB record pointing at it,
// typically left behind by a request that failed after the file write but
// before the DB save. One scan/clean pair serves both entries.
export const scanOrphanFiles = asyncHandler(async (req, res) => {
  const orphans = await scanLocalOrphans();
  const totalBytes = orphans.reduce((sum, o) => sum + o.sizeBytes, 0);
  res.json({ orphans, totalBytes, count: orphans.length });
});

export const cleanOrphanFiles = asyncHandler(async (req, res) => {
  const orphans = await scanLocalOrphans();
  let freedBytes = 0;
  for (const orphan of orphans) {
    await fs.promises.unlink(path.join(orphan.dir, orphan.filename)).catch(() => {});
    freedBytes += orphan.sizeBytes;
  }

  res.json({ removed: orphans.length, freedBytes });
  logAdminAction({
    actor: req.userId,
    action: 'storage_cleanup',
    targetType: null,
    details: `Removed ${orphans.length} orphaned file(s), freed ${freedBytes} bytes`,
  });
});
