import { Category } from '../models/Category.js';
import { DEFAULT_CATEGORIES } from '../constants/categories.js';

// Idempotent — upserts each default so re-running on every boot never
// duplicates or overwrites a category a user has since renamed... except we
// don't support renaming yet, so this just fills in anything missing.
export async function seedCategories() {
  await Promise.all(
    DEFAULT_CATEGORIES.map((c) =>
      Category.updateOne(
        { id: c.id },
        { $setOnInsert: { ...c, isDefault: true } },
        { upsert: true }
      )
    )
  );
}
