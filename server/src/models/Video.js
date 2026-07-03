import mongoose from 'mongoose';
import { CATEGORY_IDS } from '../constants/categories.js';

const { Schema } = mongoose;

const videoSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    // 'upload' videos are served from our own storage; 'youtube' videos are
    // metadata-only records played back via YouTube's official embed — see
    // filename/mimeType/sizeBytes below, which only apply to 'upload'.
    source: {
      type: String,
      enum: ['upload', 'youtube'],
      default: 'upload',
      index: true,
    },
    youtubeVideoId: {
      type: String,
      default: null,
    },
    youtubeThumbnailUrl: {
      type: String,
      default: null,
    },
    // Randomized on-disk name (see utils/filename.js) — never derived from
    // user input, so the streaming controller can never be path-traversed.
    filename: {
      type: String,
      required: function () {
        return this.source === 'upload';
      },
    },
    originalName: {
      type: String,
      default: '',
    },
    thumbnailFilename: {
      type: String,
      default: null,
    },
    mimeType: {
      type: String,
      required: function () {
        return this.source === 'upload';
      },
    },
    sizeBytes: {
      type: Number,
      required: function () {
        return this.source === 'upload';
      },
    },
    durationSeconds: {
      type: Number,
      default: null,
    },
    // Where `filename`/`thumbnailFilename` actually live — 'local' resolves
    // via VIDEO_STORAGE_DIR as before; 'r2' resolves via a signed URL. Lets
    // cloud storage be introduced without touching already-uploaded videos.
    storageProvider: {
      type: String,
      enum: ['local', 'r2'],
      default: 'local',
    },
    transcodeStatus: {
      type: String,
      enum: ['none', 'processing', 'ready', 'failed'],
      default: 'none',
    },
    // Multi-resolution variants produced by the transcoding pipeline, in
    // addition to the original `filename` (always kept as the source/"Auto"
    // quality).
    variants: [
      {
        _id: false,
        resolution: { type: String, required: true }, // e.g. "480p"
        filename: { type: String, required: true },
        storageProvider: { type: String, enum: ['local', 'r2'], default: 'local' },
        sizeBytes: { type: Number, default: 0 },
      },
    ],
    uploader: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: CATEGORY_IDS,
      default: 'other',
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likesCount: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
      set: (tags) => [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))],
      index: true,
    },
    collections: [{ type: Schema.Types.ObjectId, ref: 'Collection', index: true }],
  },
  { timestamps: true }
);

videoSchema.index(
  { title: 'text', tags: 'text', description: 'text' },
  { weights: { title: 10, tags: 5, description: 1 }, name: 'video_search_text' }
);

export const Video = mongoose.model('Video', videoSchema);
