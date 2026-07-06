// The original fixed taxonomy — now just the *seed data* for the Category
// collection (see utils/seedCategories.js) rather than the sole source of
// truth. Kept here since client/src/features/videos/categories.js still owns
// the matching colors for these specific ids and needs to stay in sync.
export const DEFAULT_CATEGORIES = [
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'news', label: 'News', emoji: '📰' },
  { id: 'education', label: 'Education', emoji: '📚' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'comedy', label: 'Comedy', emoji: '😂' },
  { id: 'movies', label: 'Movies & Shows', emoji: '🍿' },
  { id: 'technology', label: 'Technology', emoji: '💻' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'cooking', label: 'Cooking & Food', emoji: '🍳' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'fashion', label: 'Fashion & Beauty', emoji: '💄' },
  { id: 'fitness', label: 'Fitness & Health', emoji: '💪' },
  { id: 'diy', label: 'DIY & Crafts', emoji: '🛠️' },
  { id: 'art', label: 'Art & Design', emoji: '🎨' },
  { id: 'documentary', label: 'Documentary', emoji: '🎥' },
  { id: 'business', label: 'Business & Finance', emoji: '💼' },
  { id: 'kids', label: 'Kids & Family', emoji: '🧸' },
  { id: 'vlogs', label: 'Vlogs', emoji: '📹' },
  { id: 'podcasts', label: 'Podcasts', emoji: '🎙️' },
  { id: 'automotive', label: 'Automotive', emoji: '🚗' },
  { id: 'nature', label: 'Nature & Animals', emoji: '🐾' },
  { id: 'other', label: 'Other', emoji: '📁' },
];

export const CATEGORY_IDS = DEFAULT_CATEGORIES.map((c) => c.id);
