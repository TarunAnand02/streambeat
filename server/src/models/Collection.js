import mongoose from 'mongoose';

const { Schema } = mongoose;

const collectionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Private by default — matches how a pre-existing collection (created
    // before this field existed, so it's simply absent) must behave: never
    // suddenly visible on someone's channel page just because a query
    // matches it. Only owner-initiated has any actual effect either way.
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
      index: true,
    },
    // Optional parent collection, for organizing collections into folders.
    // Only ever set to another collection owned by the same user.
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Collection',
      default: null,
      index: true,
    },
    collaborators: [
      {
        _id: false,
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['viewer', 'editor'], required: true },
      },
    ],
    // Manual play-order hint for "play as playlist" — filtered against live
    // membership (Video.collections) at read time, so it never needs to be
    // kept in sync on every add/remove; entries for videos no longer in the
    // collection are just ignored, and new members without a saved position
    // render after the ordered ones.
    videoOrder: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
    // Marks the one auto-created "Watch Later" collection per user (find-or
    // -create'd the first time it's needed) — lets the quick-add button work
    // without the client ever needing to know that collection's id upfront.
    isWatchLater: {
      type: Boolean,
      default: false,
    },
    // Pinned collections sort first on the Collections page.
    pinned: {
      type: Boolean,
      default: false,
    },
    // Gmail-style label — a hex string, purely cosmetic, no meaning attached
    // server-side beyond storing/returning it.
    color: {
      type: String,
      default: null,
    },
    // Hides a collection from the default Collections list without deleting
    // it or touching its videos.
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

collectionSchema.index({ 'collaborators.user': 1 });

export const Collection = mongoose.model('Collection', collectionSchema);
