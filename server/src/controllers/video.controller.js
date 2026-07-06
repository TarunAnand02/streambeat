import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { Collection } from '../models/Collection.js';
import { Comment } from '../models/Comment.js';
import { Note } from '../models/Note.js';
import { Subscription } from '../models/Subscription.js';
import { Video } from '../models/Video.js';
import { ViewEvent } from '../models/ViewEvent.js';
import { WatchHistory } from '../models/WatchHistory.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createNotification } from './notification.controller.js';
import {
  CAPTION_STORAGE_DIR,
  THUMBNAIL_STORAGE_DIR,
  VIDEO_STORAGE_DIR,
  assertThumbnailSize,
} from '../middleware/upload.middleware.js';
import { randomFilenameFor } from '../utils/filename.js';
import {
  deleteFileFromCloud,
  getFileStream,
  getSignedFileUrl,
  isCloudStorageConfigured,
  uploadFileToCloud,
} from '../utils/storage.js';
import { transcodeVideo } from '../utils/transcode.js';
import {
  MAX_URL_IMPORT_BYTES,
  fetchAndValidateVideoResponse,
  validateImportUrl,
} from '../utils/urlImport.js';
import {
  extractChannelIdentifier,
  extractVideoId,
  fetchChannelVideos,
  fetchYoutubeMetadata,
  resolveChannel,
} from '../utils/youtube.js';

// Uploads a just-saved local video/thumbnail file to cloud storage when
// configured, returning the storage provider to record on the Video doc.
// No-op (stays local) when cloud storage isn't configured.
export async function persistUploadedFile(localPath, filename, mimeType) {
  if (!isCloudStorageConfigured()) return 'local';
  await uploadFileToCloud(localPath, filename, mimeType);
  return 'r2';
}

export const createVideo = asyncHandler(async (req, res) => {
  const videoFile = req.files?.video?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  if (!videoFile) {
    throw new ApiError(400, 'A video file is required');
  }

  if (thumbnailFile && !assertThumbnailSize(thumbnailFile)) {
    fs.unlink(videoFile.path, () => {});
    throw new ApiError(400, 'Thumbnail exceeds the 5MB size limit');
  }

  const storageProvider = await persistUploadedFile(videoFile.path, videoFile.filename, videoFile.mimetype);
  if (thumbnailFile) {
    await persistUploadedFile(thumbnailFile.path, thumbnailFile.filename, thumbnailFile.mimetype);
  }

  const video = await Video.create({
    title: req.body.title,
    description: req.body.description || '',
    category: req.body.category || 'other',
    durationSeconds: req.body.durationSeconds || null,
    filename: videoFile.filename,
    originalName: videoFile.originalname,
    thumbnailFilename: thumbnailFile ? thumbnailFile.filename : null,
    mimeType: videoFile.mimetype,
    sizeBytes: videoFile.size,
    uploader: req.userId,
    storageProvider,
    visibility: req.body.visibility || 'public',
  });

  res.status(201).json({ video });
  transcodeVideo(video._id).catch(() => {});
});

export const importFromUrl = asyncHandler(async (req, res) => {
  const validatedUrl = await validateImportUrl(req.body.url);
  const { response, contentType } = await fetchAndValidateVideoResponse(validatedUrl);

  const filename = randomFilenameFor(contentType, 'video');
  if (!filename) {
    throw new ApiError(400, `Unsupported content type: ${contentType}`);
  }
  const filePath = path.join(VIDEO_STORAGE_DIR, filename);

  let bytesWritten = 0;
  // Content-Length can be absent or wrong, so enforce the cap on the actual
  // bytes streamed too, not just the header — abort mid-download if exceeded.
  const sizeGuard = new Transform({
    transform(chunk, encoding, callback) {
      bytesWritten += chunk.length;
      if (bytesWritten > MAX_URL_IMPORT_BYTES) {
        callback(new ApiError(413, 'That file exceeds the 500MB size limit'));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(response.body, sizeGuard, fs.createWriteStream(filePath));
  } catch (err) {
    fs.unlink(filePath, () => {});
    throw err instanceof ApiError ? err : new ApiError(502, 'Failed to download that file');
  }

  const storageProvider = await persistUploadedFile(filePath, filename, contentType);

  const video = await Video.create({
    title: req.body.title,
    description: req.body.description || '',
    category: req.body.category || 'other',
    filename,
    originalName: '',
    mimeType: contentType,
    sizeBytes: bytesWritten,
    uploader: req.userId,
    storageProvider,
  });

  res.status(201).json({ video });
  transcodeVideo(video._id).catch(() => {});
});

// Shared by listVideos and searchVideos so "narrow by category/tags/duration/
// collection" behaves identically whether or not a free-text query is active.
function buildVideoFilter(query) {
  // Discovery surfaces (home feed, search) never include unlisted/private
  // videos — even for their own uploader, matching how unlisted/private
  // videos work on real platforms (reachable only via direct link, or via
  // the owner's own channel page).
  const filter = { visibility: 'public' };
  if (query.category) filter.category = query.category;
  if (query.tags?.length) filter.tags = { $all: query.tags };
  if (query.collectionId) filter.collections = query.collectionId;
  if (query.minDuration !== undefined || query.maxDuration !== undefined) {
    filter.durationSeconds = {};
    if (query.minDuration !== undefined) filter.durationSeconds.$gte = query.minDuration;
    if (query.maxDuration !== undefined) filter.durationSeconds.$lte = query.maxDuration;
  }
  return filter;
}

export const listVideos = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const filter = buildVideoFilter(req.query);

  const videos = await Video.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('uploader', 'username avatarUrl')
    .lean();

  res.json({ videos, page, limit });
});

// Unlisted videos are reachable by anyone with the link (just not listed in
// feeds/search); private videos are only ever visible to the owner. 404
// rather than 403 so a private video's existence isn't revealed. Shared by
// every route that exposes a video's metadata or raw asset bytes (stream,
// thumbnail, caption) — not just the metadata endpoint.
export function assertViewable(video, userId) {
  const isOwner = userId && video.uploader._id
    ? video.uploader._id.toString() === userId
    : video.uploader.toString() === userId;
  if (video.visibility === 'private' && !isOwner) {
    throw new ApiError(404, 'Video not found');
  }
}

export const getVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id).populate(
    'uploader',
    'username avatarUrl'
  );
  if (!video) throw new ApiError(404, 'Video not found');
  assertViewable(video, req.userId);

  const subscriberCount = await Subscription.countDocuments({ channel: video.uploader._id });
  const isSubscribed = req.userId
    ? Boolean(await Subscription.exists({ subscriber: req.userId, channel: video.uploader._id }))
    : false;

  res.json({ video, subscriberCount, isSubscribed });
});

export const incrementView = asyncHandler(async (req, res) => {
  const video = await Video.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: true }
  );
  if (!video) throw new ApiError(404, 'Video not found');
  ViewEvent.create({ video: video._id }).catch(() => {});

  if (req.userId) {
    WatchHistory.findOneAndUpdate(
      { user: req.userId, video: video._id },
      { watchedAt: new Date() },
      { upsert: true }
    ).catch(() => {});
  }

  res.json({ views: video.views });
});

export const streamVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  // No visibility check here (unlike getVideo) — native <video>/<track>
  // elements can't attach an Authorization header, so the owner themselves
  // couldn't play their own private video if this enforced it. The metadata
  // endpoint already keeps a private video from ever being discovered or
  // rendered by a non-owner; this raw stream URL is only ever reachable via
  // that page, same "unguessable id" model thumbnails already relied on.
  if (video.source !== 'upload') {
    throw new ApiError(400, 'This video is hosted on YouTube, not streamed locally');
  }

  // Resolve which file to serve: either the original or a ready transcoded
  // variant, each of which independently tracks its own storage provider.
  let filename = video.filename;
  let storageProvider = video.storageProvider;
  let mimeType = video.mimeType;
  if (req.query.resolution) {
    const variant = video.variants.find((v) => v.resolution === req.query.resolution);
    if (variant) {
      filename = variant.filename;
      storageProvider = variant.storageProvider;
      mimeType = 'video/mp4'; // transcoded variants are always mp4
    }
  }

  if (storageProvider === 'r2') {
    const url = await getSignedFileUrl(filename);
    return res.redirect(302, url);
  }

  // filename comes from the DB record, never from req.params, so this can
  // never be path-traversed regardless of what :id the client sends.
  const filePath = path.join(VIDEO_STORAGE_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Video file missing on disk');
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match || (match[1] === '' && match[2] === '')) {
    res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
    res.end();
    return;
  }

  let start;
  let end;
  if (match[1] === '') {
    // Suffix range, e.g. "bytes=-500" — the last 500 bytes of the file.
    const suffixLength = parseInt(match[2], 10);
    start = Math.max(stat.size - suffixLength, 0);
    end = stat.size - 1;
  } else {
    start = parseInt(match[1], 10);
    end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
  }

  if (start >= stat.size || end >= stat.size || start > end) {
    res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
    res.end();
    return;
  }

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    'Content-Type': mimeType,
  });
  fs.createReadStream(filePath, { start, end }).pipe(res);
});

export const getThumbnail = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video || !video.thumbnailFilename) {
    throw new ApiError(404, 'Thumbnail not found');
  }
  // See streamVideo — no visibility check here; <img> can't send an auth
  // header either, and the metadata endpoint already gates discovery.

  if (video.storageProvider === 'r2') {
    const url = await getSignedFileUrl(video.thumbnailFilename);
    return res.redirect(302, url);
  }

  const filePath = path.join(THUMBNAIL_STORAGE_DIR, video.thumbnailFilename);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Thumbnail file missing on disk');
  }
  res.sendFile(filePath);
});

export const getCaption = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video || !video.captionFilename) {
    throw new ApiError(404, 'Caption not found');
  }
  // See streamVideo — no visibility check here; <track> can't send an auth
  // header either, and the metadata endpoint already gates discovery.

  if (video.storageProvider === 'r2') {
    // Proxied (not redirected) — see getFileStream's comment for why.
    res.type('text/vtt');
    const stream = await getFileStream(video.captionFilename);
    return pipeline(stream, res).catch(() => {});
  }

  const filePath = path.join(CAPTION_STORAGE_DIR, video.captionFilename);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Caption file missing on disk');
  }
  res.type('text/vtt');
  res.sendFile(filePath);
});

export const updateVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.uploader.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this video');
  }

  if (req.body.title !== undefined) video.title = req.body.title;
  if (req.body.description !== undefined) video.description = req.body.description;
  if (req.body.category !== undefined) video.category = req.body.category;
  if (req.body.tags !== undefined) video.tags = req.body.tags;
  if (req.body.visibility !== undefined) video.visibility = req.body.visibility;

  if (req.body.collections !== undefined) {
    // Allow collections you own outright, or ones you've been granted
    // editor access to as a collaborator — viewers can't add videos.
    const accessible = await Collection.countDocuments({
      _id: { $in: req.body.collections },
      $or: [
        { owner: req.userId },
        { collaborators: { $elemMatch: { user: req.userId, role: 'editor' } } },
      ],
    });
    if (accessible !== req.body.collections.length) {
      throw new ApiError(403, 'One or more collections are not accessible to you');
    }
    video.collections = req.body.collections;
  }

  await video.save();

  res.json({ video });
});

// Replaces (or adds, if it was skipped at upload time) the thumbnail on an
// already-uploaded video. Only meaningful for 'upload'-sourced videos —
// YouTube-sourced ones always use YouTube's own thumbnail.
export const updateThumbnail = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.uploader.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this video');
  }
  if (video.source !== 'upload') {
    throw new ApiError(400, 'YouTube-sourced videos use their own thumbnail');
  }
  if (!req.file) {
    throw new ApiError(400, 'A thumbnail image is required');
  }
  if (!assertThumbnailSize(req.file)) {
    throw new ApiError(400, 'Thumbnail exceeds the 5MB size limit');
  }

  const oldFilename = video.thumbnailFilename;
  const oldStorageProvider = video.storageProvider;

  const storageProvider = await persistUploadedFile(req.file.path, req.file.filename, req.file.mimetype);

  video.thumbnailFilename = req.file.filename;
  // Only 'upgrade' storageProvider (local -> cloud) when cloud is configured
  // now — never silently move the video's own file, just track where this
  // new thumbnail actually landed alongside it.
  if (storageProvider === 'r2') video.storageProvider = 'r2';
  await video.save();

  if (oldFilename) {
    if (oldStorageProvider === 'r2') {
      deleteFileFromCloud(oldFilename);
    } else {
      fs.unlink(path.join(THUMBNAIL_STORAGE_DIR, oldFilename), () => {});
    }
  }

  res.json({ video });
});

// Replaces (or adds) the WebVTT caption track on an already-uploaded video.
export const updateCaption = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.uploader.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this video');
  }
  if (video.source !== 'upload') {
    throw new ApiError(400, "YouTube-sourced videos use YouTube's own captions");
  }
  if (!req.file) {
    throw new ApiError(400, 'A .vtt caption file is required');
  }

  const oldFilename = video.captionFilename;
  const oldStorageProvider = video.storageProvider;

  const storageProvider = await persistUploadedFile(req.file.path, req.file.filename, 'text/vtt');

  video.captionFilename = req.file.filename;
  if (storageProvider === 'r2') video.storageProvider = 'r2';
  await video.save();

  if (oldFilename) {
    if (oldStorageProvider === 'r2') {
      deleteFileFromCloud(oldFilename);
    } else {
      fs.unlink(path.join(CAPTION_STORAGE_DIR, oldFilename), () => {});
    }
  }

  res.json({ video });
});

// Removes the original file, thumbnail, caption, and any transcoded variants
// for an 'upload'-sourced video, from whichever storage each lives in.
function deleteVideoFiles(video) {
  if (video.source !== 'upload') return;

  if (video.storageProvider === 'r2') {
    deleteFileFromCloud(video.filename);
  } else {
    fs.unlink(path.join(VIDEO_STORAGE_DIR, video.filename), () => {});
  }

  if (video.thumbnailFilename) {
    if (video.storageProvider === 'r2') {
      deleteFileFromCloud(video.thumbnailFilename);
    } else {
      fs.unlink(path.join(THUMBNAIL_STORAGE_DIR, video.thumbnailFilename), () => {});
    }
  }

  if (video.captionFilename) {
    if (video.storageProvider === 'r2') {
      deleteFileFromCloud(video.captionFilename);
    } else {
      fs.unlink(path.join(CAPTION_STORAGE_DIR, video.captionFilename), () => {});
    }
  }

  for (const variant of video.variants || []) {
    if (variant.storageProvider === 'r2') {
      deleteFileFromCloud(variant.filename);
    } else {
      fs.unlink(path.join(VIDEO_STORAGE_DIR, variant.filename), () => {});
    }
  }
}

export const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.uploader.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this video');
  }

  deleteVideoFiles(video);

  await Note.deleteMany({ video: video._id });
  await ViewEvent.deleteMany({ video: video._id });
  await WatchHistory.deleteMany({ video: video._id });
  await Comment.deleteMany({ video: video._id });
  await video.deleteOne();
  res.status(204).send();
});

export const bulkAction = asyncHandler(async (req, res) => {
  const { videoIds: rawVideoIds, action, tags, collectionId } = req.body;
  // De-duplicate client-supplied ids so a duplicate in the array can't cause
  // a spurious "not found" (Video.find naturally de-dupes matches, but the
  // requested-count comparison below needs to match against unique ids too).
  const videoIds = [...new Set(rawVideoIds.map(String))];

  const videos = await Video.find({ _id: { $in: videoIds } });
  if (videos.length !== videoIds.length) {
    throw new ApiError(404, 'One or more videos were not found');
  }
  const notOwned = videos.some((v) => v.uploader.toString() !== req.userId);
  if (notOwned) {
    throw new ApiError(403, 'You do not own one or more of the selected videos');
  }

  if (action === 'delete') {
    for (const video of videos) {
      deleteVideoFiles(video);
    }
    await Note.deleteMany({ video: { $in: videoIds } });
    await ViewEvent.deleteMany({ video: { $in: videoIds } });
    await WatchHistory.deleteMany({ video: { $in: videoIds } });
    await Comment.deleteMany({ video: { $in: videoIds } });
    await Video.deleteMany({ _id: { $in: videoIds } });
    return res.json({ action, count: videoIds.length });
  }

  if (action === 'addTags') {
    // $addToSet on a raw updateMany bypasses the schema's tag-normalizing
    // setter (that only runs on document.save()), so normalize here too.
    const normalizedTags = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    await Video.updateMany(
      { _id: { $in: videoIds } },
      { $addToSet: { tags: { $each: normalizedTags } } }
    );
    return res.json({ action, count: videoIds.length });
  }

  if (action === 'addToCollection') {
    const accessible = await Collection.exists({
      _id: collectionId,
      $or: [
        { owner: req.userId },
        { collaborators: { $elemMatch: { user: req.userId, role: 'editor' } } },
      ],
    });
    if (!accessible) throw new ApiError(403, 'You do not have edit access to this collection');
    await Video.updateMany(
      { _id: { $in: videoIds } },
      { $addToSet: { collections: collectionId } }
    );
    return res.json({ action, count: videoIds.length });
  }
});

export const toggleLike = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');

  const alreadyLiked = video.likes.some((id) => id.toString() === req.userId);

  const update = alreadyLiked
    ? { $pull: { likes: req.userId }, $inc: { likesCount: -1 } }
    : { $addToSet: { likes: req.userId }, $inc: { likesCount: 1 } };

  const updated = await Video.findByIdAndUpdate(req.params.id, update, {
    new: true,
  });

  res.json({ liked: !alreadyLiked, likesCount: updated.likesCount });

  if (!alreadyLiked) {
    createNotification({
      recipient: updated.uploader,
      type: 'like',
      actor: req.userId,
      video: updated._id,
    });
  }
});

// Notes are private per (video, user) — any authenticated viewer can keep
// their own timestamped notes on any video, not just the uploader.
export const createNote = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');

  const note = await Note.create({
    video: req.params.id,
    user: req.userId,
    timestampSeconds: req.body.timestampSeconds,
    text: req.body.text,
  });
  res.status(201).json({ note });
});

export const listNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ video: req.params.id, user: req.userId }).sort({
    timestampSeconds: 1,
  });
  res.json({ notes });
});

export const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.noteId);
  if (!note || note.video.toString() !== req.params.id) {
    throw new ApiError(404, 'Note not found');
  }
  if (note.user.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this note');
  }
  await note.deleteOne();
  res.status(204).send();
});

export const searchVideos = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = { ...buildVideoFilter(req.query), $text: { $search: q } };

  const videos = await Video.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(50)
    .populate('uploader', 'username avatarUrl')
    .lean();

  res.json({ videos });
});

// Small, fast lookup for the search-as-you-type dropdown — title only, no
// heavy population, capped tightly since it fires on every keystroke.
export const suggestVideos = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const videos = await Video.find(
    { $text: { $search: q }, visibility: 'public' },
    { score: { $meta: 'textScore' }, title: 1, source: 1, thumbnailFilename: 1, youtubeThumbnailUrl: 1 }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(6)
    .lean();

  res.json({ videos });
});

const RECOMMENDATION_LIMIT = 20;
const RECOMMENDATION_CANDIDATE_POOL = 300;

// Heuristic recommendations (no ML/paid API): score candidate videos by how
// much their category/tags overlap with what the viewer has watched
// recently, break ties by view count. Falls back to overall trending videos
// for logged-out viewers or anyone without enough history yet.
export const getRecommended = asyncHandler(async (req, res) => {
  if (!req.userId) {
    const trending = await Video.find({ visibility: 'public' })
      .sort({ views: -1 })
      .limit(RECOMMENDATION_LIMIT)
      .populate('uploader', 'username avatarUrl')
      .lean();
    return res.json({ videos: trending });
  }

  const history = await WatchHistory.find({ user: req.userId })
    .sort({ watchedAt: -1 })
    .limit(50)
    .populate('video', 'category tags')
    .lean();

  const watchedIds = history.map((h) => h.video?._id).filter(Boolean);

  if (watchedIds.length === 0) {
    const trending = await Video.find({ uploader: { $ne: req.userId }, visibility: 'public' })
      .sort({ views: -1 })
      .limit(RECOMMENDATION_LIMIT)
      .populate('uploader', 'username avatarUrl')
      .lean();
    return res.json({ videos: trending });
  }

  const categoryCounts = new Map();
  const tagCounts = new Map();
  for (const { video } of history) {
    if (!video) continue;
    categoryCounts.set(video.category, (categoryCounts.get(video.category) || 0) + 1);
    for (const tag of video.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const candidates = await Video.find({
    _id: { $nin: watchedIds },
    uploader: { $ne: req.userId },
    visibility: 'public',
  })
    .sort({ createdAt: -1 })
    .limit(RECOMMENDATION_CANDIDATE_POOL)
    .populate('uploader', 'username avatarUrl')
    .lean();

  const scored = candidates.map((video) => {
    let score = categoryCounts.get(video.category) || 0;
    for (const tag of video.tags || []) {
      score += (tagCounts.get(tag) || 0) * 0.5;
    }
    return { video, score };
  });

  scored.sort((a, b) => b.score - a.score || b.video.views - a.video.views);

  res.json({ videos: scored.slice(0, RECOMMENDATION_LIMIT).map((s) => s.video) });
});

export const previewYoutube = asyncHandler(async (req, res) => {
  const videoId = extractVideoId(req.query.url);
  if (!videoId) {
    throw new ApiError(400, 'Could not parse a YouTube video id from that URL');
  }

  const metadata = await fetchYoutubeMetadata(videoId);
  res.json({ preview: metadata });
});

export const importYoutubeVideo = asyncHandler(async (req, res) => {
  const { youtubeVideoId, title, description, category, thumbnailUrl, durationSeconds } =
    req.body;

  const video = await Video.create({
    source: 'youtube',
    youtubeVideoId,
    youtubeThumbnailUrl: thumbnailUrl || null,
    title,
    description: description || '',
    category: category || 'other',
    durationSeconds: durationSeconds || null,
    uploader: req.userId,
  });

  res.status(201).json({ video });
});

export const previewYoutubeChannel = asyncHandler(async (req, res) => {
  const identifier = extractChannelIdentifier(req.query.url);
  if (!identifier) {
    throw new ApiError(400, 'Could not parse a YouTube channel from that URL');
  }

  const channel = await resolveChannel(identifier);
  if (!channel.uploadsPlaylistId) {
    throw new ApiError(404, 'This channel has no public uploads');
  }

  const { videos, nextPageToken } = await fetchChannelVideos(
    channel.uploadsPlaylistId,
    req.query.pageToken
  );

  res.json({ channel, videos, nextPageToken });
});

export const importYoutubeBatch = asyncHandler(async (req, res) => {
  const { category, videos } = req.body;

  const docs = videos.map((v) => ({
    source: 'youtube',
    youtubeVideoId: v.youtubeVideoId,
    youtubeThumbnailUrl: v.thumbnailUrl || null,
    title: v.title,
    description: v.description || '',
    category: category || 'other',
    durationSeconds: v.durationSeconds || null,
    uploader: req.userId,
  }));

  const created = await Video.insertMany(docs);
  res.status(201).json({ videos: created, count: created.length });
});
