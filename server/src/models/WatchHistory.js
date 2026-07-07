import mongoose from 'mongoose';

const { Schema } = mongoose;

// One row per (user, video) — re-watching just bumps watchedAt rather than
// growing unboundedly, so "history" naturally reflects most-recent-first
// without needing separate de-duplication logic downstream.
const watchHistorySchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  video: {
    type: Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
  },
  watchedAt: {
    type: Date,
    default: Date.now,
  },
  // Powers "resume where you left off" and the "Continue Watching" row —
  // durationSeconds is saved alongside so both can tell "just started" from
  // "basically finished" without a separate lookup against the video.
  positionSeconds: {
    type: Number,
    default: 0,
  },
  durationSeconds: {
    type: Number,
    default: null,
  },
  // Per-video playback preferences, restored the next time this exact video
  // is opened — previously these reset to defaults on every load.
  playbackRate: {
    type: Number,
    default: 1,
  },
  resolution: {
    type: String,
    default: 'auto',
  },
  captionsOn: {
    type: Boolean,
    default: false,
  },
});

watchHistorySchema.index({ user: 1, video: 1 }, { unique: true });
watchHistorySchema.index({ user: 1, watchedAt: -1 });

export const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);
