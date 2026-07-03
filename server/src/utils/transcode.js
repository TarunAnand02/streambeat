import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { VIDEO_STORAGE_DIR } from '../middleware/upload.middleware.js';
import { Video } from '../models/Video.js';
import { randomFilenameFor } from './filename.js';
import { getSignedFileUrl, isCloudStorageConfigured, uploadFileToCloud } from './storage.js';

// Only generate variants strictly smaller than the source — no upscaling.
const TARGET_HEIGHTS = [1080, 720, 480, 360];

function ffprobeHeight(inputSource) {
  return new Promise((resolve) => {
    const args = [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=height',
      '-of', 'csv=p=0',
      inputSource,
    ];
    const proc = spawn(env.ffprobePath, args);
    let output = '';
    proc.stdout.on('data', (chunk) => {
      output += chunk;
    });
    proc.on('close', () => {
      const height = parseInt(output.trim(), 10);
      resolve(Number.isFinite(height) ? height : null);
    });
    proc.on('error', () => resolve(null));
  });
}

function runFfmpeg(inputSource, outputPath, height) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', inputSource,
      '-vf', `scale=-2:${height}`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath,
    ];
    const proc = spawn(env.ffmpegPath, args);
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}

// Fire-and-forget background job kicked off right after a native upload
// finishes — never awaited by the request handler, since transcoding a
// full video can take anywhere from seconds to minutes. Progress is tracked
// via Video.transcodeStatus so the client can poll/reflect it.
export async function transcodeVideo(videoId) {
  const video = await Video.findById(videoId);
  if (!video || video.source !== 'upload') return;

  video.transcodeStatus = 'processing';
  await video.save();

  try {
    const inputSource =
      video.storageProvider === 'r2'
        ? await getSignedFileUrl(video.filename)
        : path.join(VIDEO_STORAGE_DIR, video.filename);

    const sourceHeight = await ffprobeHeight(inputSource);
    const targets = sourceHeight
      ? TARGET_HEIGHTS.filter((h) => h < sourceHeight)
      : TARGET_HEIGHTS.slice(2); // ffprobe unavailable/failed — play it safe with smaller variants only

    const variants = [];
    for (const height of targets) {
      const filename = randomFilenameFor('video/mp4', 'video');
      const outputPath = path.join(VIDEO_STORAGE_DIR, filename);
      await runFfmpeg(inputSource, outputPath, height);
      const stat = await fs.promises.stat(outputPath);

      let storageProvider = 'local';
      if (isCloudStorageConfigured()) {
        await uploadFileToCloud(outputPath, filename, 'video/mp4');
        storageProvider = 'r2';
      }

      variants.push({ resolution: `${height}p`, filename, storageProvider, sizeBytes: stat.size });
    }

    video.variants = variants;
    video.transcodeStatus = 'ready';
    await video.save();
  } catch (err) {
    video.transcodeStatus = 'failed';
    await video.save();
    // eslint-disable-next-line no-console
    console.error(`[transcode] failed for video ${videoId}:`, err.message);
  }
}
