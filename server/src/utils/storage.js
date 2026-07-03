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
  return Boolean(env.r2.accountId && env.r2.accessKeyId && env.r2.secretAccessKey && env.r2.bucket);
}

function getClient() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey,
      },
    });
  }
  return client;
}

// Uploads a local file to R2 under `key` (we reuse our own randomized
// filenames as keys, so no separate naming scheme is needed) and deletes the
// local copy afterward — cloud storage is meant to replace local disk for
// these files, not duplicate them.
export async function uploadFileToCloud(localPath, key, contentType) {
  const body = fs.createReadStream(localPath);
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.r2.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  await fs.promises.unlink(localPath).catch(() => {});
}

export async function deleteFileFromCloud(key) {
  await getClient()
    .send(new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: key }))
    .catch(() => {});
}

// Short-lived signed URL so the browser can fetch/stream the object directly
// from R2 (which has no egress fees) instead of proxying bytes through our
// own server.
export async function getSignedFileUrl(key, expiresInSeconds = 3600) {
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: env.r2.bucket, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
