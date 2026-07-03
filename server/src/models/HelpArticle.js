import mongoose from 'mongoose';

const { Schema } = mongoose;

const helpArticleSchema = new Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    // Position within its category; also used as a tiebreaker for category
    // ordering (lowest order among a category's articles wins) so admins
    // don't need a separate "categories" concept to manage.
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const HelpArticle = mongoose.model('HelpArticle', helpArticleSchema);
