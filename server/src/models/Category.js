import mongoose from 'mongoose';

const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    // Matches Video.category — a URL/select-friendly slug, not a display
    // string. Unique so "createCategory" can safely double as
    // find-or-create without ever violating this index.
    id: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    emoji: {
      type: String,
      default: '📁',
    },
    // Seeded categories vs ones users create at runtime — not used for any
    // permission check, just lets the list surface curated ones first.
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export const Category = mongoose.model('Category', categorySchema);
