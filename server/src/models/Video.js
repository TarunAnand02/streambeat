import mongoose from 'mongoose';

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
    // Single WebVTT subtitle/caption track. Shares storageProvider with the
    // rest of the video's assets (see below) — no separate field needed.
    captionFilename: {
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
    // No enum here — categories are DB-backed (see models/Category.js) and
    // can be created at runtime, so existence is checked in the controller
    // (assertCategoryExists) instead of a fixed schema-level list.
    category: {
      type: String,
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
    // 'public': listed + playable by anyone. 'unlisted': playable by anyone
    // with the direct link, but excluded from feeds/search. 'private':
    // playable only by the uploader.
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public',
      index: true,
    },
    // SHA-256 of the uploaded file's bytes — lets the storage dashboard spot
    // exact duplicate uploads. Only ever set for source:'upload' videos.
    fileHash: {
      type: String,
      default: null,
      index: true,
    },
    // Hides a video from feeds/search/channel without deleting it — distinct
    // from visibility, which is about *who* can see it; this is about
    // whether it clutters your own library.
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Admin soft-delete — distinct from a regular owner-initiated delete
    // (which removes the record and its files outright). A soft-deleted
    // video is hidden from every normal query (feeds, search, the owner's
    // own channel, direct access) but its files stay put so "Restore" in
    // the admin panel can bring it back.
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

videoSchema.index(
  { title: 'text', tags: 'text', description: 'text' },
  { weights: { title: 10, tags: 5, description: 1 }, name: 'video_search_text' }
);

export const Video = mongoose.model('Video', videoSchema);
