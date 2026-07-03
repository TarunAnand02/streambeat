import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import { env } from '../config/env.js';

let client = null;

export function isCloudStorageConfigured() {
  return Boolean(
    env.storage.endpoint && env.storage.accessKeyId && env.storage.secretAccessKey && env.storage.bucket
  );
}

// Works with any S3-compatible provider (Cloudflare R2, Supabase Storage,
// Backblaze B2, MinIO, ...) — just point STORAGE_ENDPOINT/STORAGE_REGION at
// whichever one you're using.
function getClient() {
  if (!client) {
    client = new S3Client({
      region: env.storage.region,
      endpoint: env.storage.endpoint,
      // Supabase (and some other S3-compatible providers) require
      // path-style requests (endpoint/bucket/key) rather than the
      // AWS-style virtual-hosted (bucket.endpoint/key) — safe to leave on
      // for R2 too.
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.storage.accessKeyId,
        secretAccessKey: env.storage.secretAccessKey,
      },
    });
  }
  return client;
}

// Uploads a local file to cloud storage under `key` (we reuse our own
// randomized filenames as keys, so no separate naming scheme is needed) and
// deletes the local copy afterward — cloud storage is meant to replace
// local disk for these files, not duplicate them.
export async function uploadFileToCloud(localPath, key, contentType) {
  const body = fs.createReadStream(localPath);
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.storage.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  await fs.promises.unlink(localPath).catch(() => {});
}

export async function deleteFileFromCloud(key) {
  await getClient()
    .send(new DeleteObjectCommand({ Bucket: env.storage.bucket, Key: key }))
    .catch(() => {});
}

// Short-lived signed URL so the browser can fetch/stream the object
// directly from cloud storage instead of proxying bytes through our own
// server.
export async function getSignedFileUrl(key, expiresInSeconds = 3600) {
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: env.storage.bucket, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
