// One-time migration: moves the original static help content (from
// client/src/features/help/helpData.js) into the database so it becomes
// admin-editable. Safe to re-run — skips if any HelpArticle already exists.
import 'dotenv/config';
import mongoose from 'mongoose';
import { HelpArticle } from '../src/models/HelpArticle.js';
import { helpCategories } from '../../client/src/features/help/helpData.js';

await mongoose.connect(process.env.MONGO_URI);

const existing = await HelpArticle.countDocuments();
if (existing > 0) {
  console.log(`HelpArticle collection already has ${existing} article(s) — skipping seed.`);
} else {
  const docs = helpCategories.flatMap((category) =>
    category.entries.map((entry, index) => ({
      category: category.label,
      question: entry.q,
      answer: entry.a,
      order: index,
    }))
  );
  await HelpArticle.insertMany(docs);
  console.log(`Seeded ${docs.length} help articles across ${helpCategories.length} categories.`);
}

await mongoose.disconnect();
