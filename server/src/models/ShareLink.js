import mongoose from 'mongoose';

const { Schema } = mongoose;

// Lets an owner hand out access to a video that isn't public — the token
// itself is the credential (unguessable, like the video id already is for
// the raw stream/thumbnail/caption endpoints); an optional password adds a
// second factor, checked once when the link is first opened.
const shareLinkSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    // null means "never expires".
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const ShareLink = mongoose.model('ShareLink', shareLinkSchema);
