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
    // Not required for accounts created via Google/GitHub sign-in, which
    // never set a local password at all.
    passwordHash: {
      type: String,
      required: function () {
        return !this.googleId && !this.githubId;
      },
      select: false,
    },
    // No `default: null` here deliberately — a sparse unique index only
    // excludes documents where the field is entirely absent, not documents
    // where it's explicitly null. A default of null would put every
    // non-OAuth user in the index with the same null value, so the second
    // such user to ever register would collide on this unique index.
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true,
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
    emailVerified: {
      type: Boolean,
      default: false,
    },
    // Same "store only the hash" principle as resetPasswordTokenHash.
    emailVerifyTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    emailVerifyExpires: {
      type: Date,
      default: null,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    // Base32 TOTP secret — only ever read server-side to verify a submitted
    // code, never sent to the client.
    twoFactorSecret: {
      type: String,
      default: null,
      select: false,
    },
    // SHA-256 hashes of one-time backup codes; each is deleted from this
    // array the moment it's redeemed.
    twoFactorBackupCodeHashes: {
      type: [String],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
