import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApiError } from '../utils/ApiError.js';
import {
  IMAGE_MIME_WHITELIST,
  VIDEO_MIME_WHITELIST,
  randomFilenameFor,
} from '../utils/filename.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// STORAGE_DIR lets deployments point uploads at a mounted persistent volume
// (e.g. a Render Disk) instead of the app's own directory, which is what
// most PaaS platforms wipe on every redeploy. Defaults to the existing
// in-repo path so local dev is unaffected.
const STORAGE_ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(__dirname, '../storage');

export const VIDEO_STORAGE_DIR = path.join(STORAGE_ROOT, 'videos');
export const THUMBNAIL_STORAGE_DIR = path.join(STORAGE_ROOT, 'thumbnails');

const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500MB
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir =
      file.fieldname === 'thumbnail' ? THUMBNAIL_STORAGE_DIR : VIDEO_STORAGE_DIR;
    cb(null, dir);
  },
  filename(req, file, cb) {
    // Ignore the client-supplied filename entirely; extension is derived only
    // from the whitelisted, already-verified MIME type (see fileFilter below).
    const kind = file.fieldname === 'thumbnail' ? 'image' : 'video';
    const name = randomFilenameFor(file.mimetype, kind);
    if (!name) {
      return cb(new ApiError(400, 'Unsupported file type'));
    }
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  if (file.fieldname === 'video') {
    if (!VIDEO_MIME_WHITELIST.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Unsupported video type'));
    }
    return cb(null, true);
  }
  if (file.fieldname === 'thumbnail') {
    if (!IMAGE_MIME_WHITELIST.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Unsupported thumbnail type'));
    }
    return cb(null, true);
  }
  cb(new ApiError(400, 'Unexpected field'));
}

export const uploadVideo = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_VIDEO_BYTES },
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

// For replacing just the thumbnail on an already-uploaded video (e.g. if
// the uploader forgot to pick one, or wants a better one later).
export const uploadThumbnailOnly = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_THUMBNAIL_BYTES },
}).single('thumbnail');

export function assertThumbnailSize(file) {
  if (file && file.size > MAX_THUMBNAIL_BYTES) {
    fs.unlink(file.path, () => {});
    return false;
  }
  return true;
}

for (const dir of [VIDEO_STORAGE_DIR, THUMBNAIL_STORAGE_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}
