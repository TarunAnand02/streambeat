import mongoose from 'mongoose';

const { Schema } = mongoose;

// One document per issued refresh token, so a user can see/revoke individual
// devices instead of only a blunt "log out everywhere". `jti` identifies the
// *current* refresh token for this session — it's rotated in place (not
// re-created) every time the token is refreshed, so a long-lived session
// stays as a single row rather than accumulating one per refresh.
const sessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    ip: {
      type: String,
      default: '',
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Session = mongoose.model('Session', sessionSchema);
