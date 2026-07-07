import mongoose from 'mongoose';

const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['video', 'comment'],
      required: true,
    },
    // Not a ref to a single model since targetType decides which collection
    // this points into — resolved manually wherever the target needs
    // populating, same reasoning as Video.collections not needing a
    // polymorphic ref helper for a two-way lookup.
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'violence', 'copyright', 'nudity', 'misinformation', 'other'],
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'dismissed'],
      default: 'open',
      index: true,
    },
  },
  { timestamps: true }
);

reportSchema.index({ targetType: 1, targetId: 1 });

export const Report = mongoose.model('Report', reportSchema);
