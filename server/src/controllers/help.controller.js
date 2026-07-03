import { HelpArticle } from '../models/HelpArticle.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listArticles = asyncHandler(async (req, res) => {
  const articles = await HelpArticle.find().sort({ order: 1, createdAt: 1 });

  const byCategory = new Map();
  for (const article of articles) {
    if (!byCategory.has(article.category)) {
      byCategory.set(article.category, []);
    }
    byCategory.get(article.category).push(article);
  }

  const categories = [...byCategory.entries()].map(([category, entries]) => ({
    id: category,
    label: category,
    entries,
  }));

  res.json({ categories });
});

export const createArticle = asyncHandler(async (req, res) => {
  const article = await HelpArticle.create(req.body);
  res.status(201).json({ article });
});

export const updateArticle = asyncHandler(async (req, res) => {
  const article = await HelpArticle.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!article) throw new ApiError(404, 'Article not found');
  res.json({ article });
});

export const deleteArticle = asyncHandler(async (req, res) => {
  const article = await HelpArticle.findByIdAndDelete(req.params.id);
  if (!article) throw new ApiError(404, 'Article not found');
  res.status(204).send();
});
