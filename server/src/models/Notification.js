import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['subscribe', 'comment', 'like', 'reply', 'achievement'],
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      default: null,
    },
    // Small free-form string for type-specific extra context — currently
    // only used to carry the achievement code so the client can look up its
    // title/description without a second round trip.
    meta: {
      type: String,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    // Soft-deleted notifications are excluded from listNotifications but kept
    // around briefly so a "Undo" toast can restore them without a re-fetch.
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
