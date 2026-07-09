import { z } from 'zod';

// Matches the app's own hard-coded upload MIME whitelist (utils/filename.js)
// — an admin can narrow which formats are accepted, not introduce new ones
// the upload pipeline doesn't already know how to safely name/serve.
const ALLOWED_FORMATS = ['video/mp4', 'video/webm', 'video/ogg'];

export const updateSettingsSchema = z.object({
  body: z
    .object({
      siteName: z.string().trim().min(1).max(60).optional(),
      logoUrl: z.string().trim().max(500).nullable().optional(),
      // Can only tighten the platform's hard 500MB multer ceiling, not raise
      // it — see the SiteSettings model comment.
      maxUploadSizeMB: z.number().int().min(1).max(500).optional(),
      allowedVideoFormats: z.array(z.enum(ALLOWED_FORMATS)).min(1).optional(),
      maxUploadsPerUser: z.number().int().min(1).nullable().optional(),
      defaultVideoQuality: z.enum(['auto', '1080p', '720p', '480p', '360p']).optional(),
      maintenanceMode: z.boolean().optional(),
    })
    .strict(),
  query: z.any(),
  params: z.any(),
});
