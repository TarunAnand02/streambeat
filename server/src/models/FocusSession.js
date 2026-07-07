import mongoose from 'mongoose';

const { Schema } = mongoose;

// One row per completed Study Mode session — powers the recap card and the
// "today"/weekly focus stats. Streak/total aggregates live on User.focusStats
// so reading them doesn't require scanning this collection.
const focusSessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      default: null,
    },
    goal: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    minutes: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { timestamps: true }
);

focusSessionSchema.index({ user: 1, createdAt: -1 });

export const FocusSession = mongoose.model('FocusSession', focusSessionSchema);
