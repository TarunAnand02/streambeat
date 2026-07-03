import crypto from 'crypto';
import path from 'path';

const VIDEO_EXT_BY_MIME = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogg',
};

const IMAGE_EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Never trust the client-supplied filename or extension — always derive a
// random name and a whitelisted extension purely from the verified MIME type.
export function randomFilenameFor(mimeType, kind) {
  const map = kind === 'image' ? IMAGE_EXT_BY_MIME : VIDEO_EXT_BY_MIME;
  const ext = map[mimeType];
  if (!ext) return null;
  return `${crypto.randomUUID()}${ext}`;
}

export function safeJoin(baseDir, filename) {
  const resolved = path.join(baseDir, filename);
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error('Path traversal attempt detected');
  }
  return resolved;
}

export const VIDEO_MIME_WHITELIST = Object.keys(VIDEO_EXT_BY_MIME);
export const IMAGE_MIME_WHITELIST = Object.keys(IMAGE_EXT_BY_MIME);
