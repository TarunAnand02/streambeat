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
    collaborators: [
      {
        _id: false,
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['viewer', 'editor'], required: true },
      },
    ],
  },
  { timestamps: true }
);

collectionSchema.index({ 'collaborators.user': 1 });

export const Collection = mongoose.model('Collection', collectionSchema);
