export const categories = [
  { id: 'music', label: 'Music', emoji: '🎵', color: '#8b5cf6' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', color: '#ef4444' },
  { id: 'sports', label: 'Sports', emoji: '⚽', color: '#22c55e' },
  { id: 'news', label: 'News', emoji: '📰', color: '#3b82f6' },
  { id: 'education', label: 'Education', emoji: '📚', color: '#f59e0b' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#ec4899' },
  { id: 'comedy', label: 'Comedy', emoji: '😂', color: '#eab308' },
  { id: 'movies', label: 'Movies & Shows', emoji: '🍿', color: '#6366f1' },
  { id: 'technology', label: 'Technology', emoji: '💻', color: '#06b6d4' },
  { id: 'science', label: 'Science', emoji: '🔬', color: '#14b8a6' },
  { id: 'cooking', label: 'Cooking & Food', emoji: '🍳', color: '#f97316' },
  { id: 'travel', label: 'Travel', emoji: '✈️', color: '#0ea5e9' },
  { id: 'fashion', label: 'Fashion & Beauty', emoji: '💄', color: '#d946ef' },
  { id: 'fitness', label: 'Fitness & Health', emoji: '💪', color: '#84cc16' },
  { id: 'diy', label: 'DIY & Crafts', emoji: '🛠️', color: '#a3522f' },
  { id: 'art', label: 'Art & Design', emoji: '🎨', color: '#e11d48' },
  { id: 'documentary', label: 'Documentary', emoji: '🎥', color: '#475569' },
  { id: 'business', label: 'Business & Finance', emoji: '💼', color: '#0f766e' },
  { id: 'kids', label: 'Kids & Family', emoji: '🧸', color: '#fb7185' },
  { id: 'vlogs', label: 'Vlogs', emoji: '📹', color: '#7c3aed' },
  { id: 'podcasts', label: 'Podcasts', emoji: '🎙️', color: '#334155' },
  { id: 'automotive', label: 'Automotive', emoji: '🚗', color: '#b91c1c' },
  { id: 'nature', label: 'Nature & Animals', emoji: '🐾', color: '#15803d' },
  { id: 'other', label: 'Other', emoji: '📁', color: '#57534e' },
];

export const categoryIds = categories.map((c) => c.id);

export function getCategory(id) {
  return categories.find((c) => c.id === id);
}
