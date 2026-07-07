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
    // Set automatically by the avatar upload endpoint to this app's own
    // stable `/api/users/:id/avatar` route — never a signed cloud URL
    // directly, since those expire and can't be persisted long-term.
    avatarUrl: {
      type: String,
      default: null,
    },
    avatarFilename: {
      type: String,
      default: null,
      select: false,
    },
    avatarStorageProvider: {
      type: String,
      enum: ['local', 'r2'],
      default: 'local',
      select: false,
    },
    bio: {
      type: String,
      maxlength: 300,
      default: '',
    },
    // Distraction-free mode — persisted (not just a client toggle) so it
    // follows the user across devices, same as any other preference.
    studyModeEnabled: {
      type: Boolean,
      default: false,
    },
    // Forest-style focus streak, kept on the user doc since it's a small
    // fixed-shape aggregate — the individual sessions it's derived from live
    // in their own FocusSession collection.
    focusStats: {
      _id: false,
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      // YYYY-MM-DD (UTC) of the last day a session was logged — a plain date
      // string sidesteps timezone-offset comparison bugs when checking
      // "was that yesterday?".
      lastFocusDate: { type: String, default: null },
      totalFocusMinutes: { type: Number, default: 0 },
    },
    // "Not interested" / "don't recommend this channel" — internal
    // recommendation-tuning state, never exposed to any other user, so kept
    // out of the default projection like the other select:false fields.
    notInterestedVideoIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Video',
      default: [],
      select: false,
    },
    blockedChannelIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      select: false,
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
