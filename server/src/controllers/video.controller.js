import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { Collection } from '../models/Collection.js';
import { Note } from '../models/Note.js';
import { Video } from '../models/Video.js';
import { ViewEvent } from '../models/ViewEvent.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  THUMBNAIL_STORAGE_DIR,
  VIDEO_STORAGE_DIR,
  assertThumbnailSize,
} from '../middleware/upload.middleware.js';
import { randomFilenameFor } from '../utils/filename.js';
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
  });

  res.status(201).json({ video });
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

  const video = await Video.create({
    title: req.body.title,
    description: req.body.description || '',
    category: req.body.category || 'other',
    filename,
    originalName: '',
    mimeType: contentType,
    sizeBytes: bytesWritten,
    uploader: req.userId,
  });

  res.status(201).json({ video });
});

// Shared by listVideos and searchVideos so "narrow by category/tags/duration/
// collection" behaves identically whether or not a free-text query is active.
function buildVideoFilter(query) {
  const filter = {};
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
    .populate('uploader', 'username avatarUrl');

  res.json({ videos, page, limit });
});

export const getVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id).populate(
    'uploader',
    'username avatarUrl'
  );
  if (!video) throw new ApiError(404, 'Video not found');
  res.json({ video });
});

export const incrementView = asyncHandler(async (req, res) => {
  const video = await Video.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: true }
  );
  if (!video) throw new ApiError(404, 'Video not found');
  ViewEvent.create({ video: video._id }).catch(() => {});
  res.json({ views: video.views });
});

export const streamVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.source !== 'upload') {
    throw new ApiError(400, 'This video is hosted on YouTube, not streamed locally');
  }

  // filename comes from the DB record, never from req.params, so this can
  // never be path-traversed regardless of what :id the client sends.
  const filePath = path.join(VIDEO_STORAGE_DIR, video.filename);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Video file missing on disk');
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': video.mimeType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;

  if (start >= stat.size || end >= stat.size || start > end) {
    res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
    res.end();
    return;
  }

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    'Content-Type': video.mimeType,
  });
  fs.createReadStream(filePath, { start, end }).pipe(res);
});

export const getThumbnail = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video || !video.thumbnailFilename) {
    throw new ApiError(404, 'Thumbnail not found');
  }
  const filePath = path.join(THUMBNAIL_STORAGE_DIR, video.thumbnailFilename);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Thumbnail file missing on disk');
  }
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

export const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  if (video.uploader.toString() !== req.userId) {
    throw new ApiError(403, 'You do not own this video');
  }

  if (video.source === 'upload') {
    const videoPath = path.join(VIDEO_STORAGE_DIR, video.filename);
    fs.unlink(videoPath, () => {});
    if (video.thumbnailFilename) {
      fs.unlink(path.join(THUMBNAIL_STORAGE_DIR, video.thumbnailFilename), () => {});
    }
  }

  await Note.deleteMany({ video: video._id });
  await ViewEvent.deleteMany({ video: video._id });
  await video.deleteOne();
  res.status(204).send();
});

export const bulkAction = asyncHandler(async (req, res) => {
  const { videoIds, action, tags, collectionId } = req.body;

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
      if (video.source === 'upload') {
        fs.unlink(path.join(VIDEO_STORAGE_DIR, video.filename), () => {});
        if (video.thumbnailFilename) {
          fs.unlink(path.join(THUMBNAIL_STORAGE_DIR, video.thumbnailFilename), () => {});
        }
      }
    }
    await Note.deleteMany({ video: { $in: videoIds } });
    await ViewEvent.deleteMany({ video: { $in: videoIds } });
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
    .populate('uploader', 'username avatarUrl');

  res.json({ videos });
});

// Small, fast lookup for the search-as-you-type dropdown — title only, no
// heavy population, capped tightly since it fires on every keystroke.
export const suggestVideos = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const videos = await Video.find(
    { $text: { $search: q } },
    { score: { $meta: 'textScore' }, title: 1, source: 1, thumbnailFilename: 1, youtubeThumbnailUrl: 1 }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(6);

  res.json({ videos });
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
