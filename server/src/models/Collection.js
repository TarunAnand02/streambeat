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
  },
  { timestamps: true }
);

collectionSchema.index({ 'collaborators.user': 1 });

export const Collection = mongoose.model('Collection', collectionSchema);
