import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: 300,
      default: '',
    },
    // Bumped on logout-all / password change to invalidate all outstanding
    // refresh tokens without needing a token blacklist collection.
    refreshTokenVersion: {
      type: Number,
      default: 0,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    // Only the SHA-256 hash of the reset token is stored — the raw token is
    // emailed to the user and never persisted, so a DB read alone can't be
    // used to reset the account (same principle as passwordHash).
    resetPasswordTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
