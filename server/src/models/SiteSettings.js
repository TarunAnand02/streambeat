import mongoose from 'mongoose';

const { Schema } = mongoose;

// Singleton — there's always exactly one row, found-or-created the same way
// the per-user Watch Later collection is (see findOrCreateWatchLater).
const siteSettingsSchema = new Schema(
  {
    siteName: {
      type: String,
      default: 'StreamBeat',
      trim: true,
      maxlength: 60,
    },
    logoUrl: {
      type: String,
      default: null,
    },
    // Upload constraints — read by both the client (to show accurate limits
    // before picking a file) and the server (actual enforcement). Capped at
    // 500 to match the hard ceiling multer's own `limits.fileSize` already
    // enforces (fixed at server boot, not reconfigurable per-request) — this
    // setting can only ever tighten that ceiling further, never raise it.
    maxUploadSizeMB: {
      type: Number,
      default: 500,
      min: 1,
      max: 500,
    },
    // Deliberately a subset of the app's own hard-coded MIME whitelist
    // (server/src/utils/filename.js) rather than free text — an admin can
    // narrow which formats are accepted, not introduce new ones the upload
    // pipeline doesn't already know how to safely name/serve.
    allowedVideoFormats: {
      type: [String],
      default: ['video/mp4', 'video/webm', 'video/ogg'],
    },
    // null (the default) means unlimited — a per-user cap on total uploads,
    // checked against Video.countDocuments({ uploader }) at upload time.
    maxUploadsPerUser: {
      type: Number,
      default: null,
      min: 1,
    },
    defaultVideoQuality: {
      type: String,
      enum: ['auto', '1080p', '720p', '480p', '360p'],
      default: 'auto',
    },
    // When true, non-admin users are shown a maintenance page instead of
    // the app — admins can still sign in and use everything normally so
    // they can turn it back off.
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
