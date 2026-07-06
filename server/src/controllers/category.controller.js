import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ isDefault: -1, label: 1 });
  res.json({ categories });
});

function slugify(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

export const createCategory = asyncHandler(async (req, res) => {
  const { label } = req.body;
  const id = slugify(label);
  if (!id) {
    throw new ApiError(400, 'That name has no usable letters or numbers');
  }

  const existing = await Category.findOne({ id });
  if (existing) {
    // Runtime "create" is really "find-or-use" — a name that (once slugified)
    // matches an existing category just returns it instead of erroring, so
    // two people independently typing "Cooking" don't end up racing on the
    // unique index or fragmenting into near-duplicate categories.
    return res.status(200).json({ category: existing });
  }

  const category = await Category.create({ id, label: label.trim(), createdBy: req.userId });
  res.status(201).json({ category });
});

// Used by video.controller.js to confirm a submitted category id is real
// before saving a video with it.
export async function assertCategoryExists(id) {
  if (!id) return;
  const exists = await Category.exists({ id });
  if (!exists) throw new ApiError(400, `Unknown category: ${id}`);
}
