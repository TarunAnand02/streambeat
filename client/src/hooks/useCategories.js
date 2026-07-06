import { useEffect, useState } from 'react';
import { fetchCategories } from '../features/videos/categoriesApi';

// Module-level cache + subscriber list — Upload/Import pages can mount
// several CategorySelect instances at once (one per queued video), and they'd
// otherwise all fire their own GET /api/categories on mount, and a category
// created from one instance wouldn't show up in the others.
let cache = null;
let inFlight = null;
const subscribers = new Set();

function notify() {
  subscribers.forEach((fn) => fn(cache));
}

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = fetchCategories()
      .then((data) => {
        cache = data;
        inFlight = null;
        notify();
        return data;
      })
      .catch((err) => {
        inFlight = null;
        throw err;
      });
  }
  return inFlight;
}

export function useCategories() {
  const [categories, setCategories] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    subscribers.add(setCategories);
    if (!cache) {
      load().then(() => setLoading(false));
    }
    return () => subscribers.delete(setCategories);
  }, []);

  function addCategory(category) {
    if (cache?.some((c) => c.id === category.id)) return;
    cache = cache ? [...cache, category] : [category];
    notify();
  }

  return { categories, loading, addCategory };
}
