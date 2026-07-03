import { useMemo, useState } from 'react';
import { helpCategories } from './helpData';
import styles from './HelpPage.module.css';

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [openCategory, setOpenCategory] = useState(helpCategories[0].id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return helpCategories;
    return helpCategories
      .map((category) => ({
        ...category,
        entries: category.entries.filter(
          (entry) => entry.q.toLowerCase().includes(q) || entry.a.toLowerCase().includes(q)
        ),
      }))
      .filter((category) => category.entries.length > 0);
  }, [query]);

  const isSearching = query.trim().length > 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Help &amp; FAQ</h1>
      <input
        className={styles.search}
        type="search"
        placeholder="Search help articles…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className={styles.empty}>No help articles match "{query}".</p>
      ) : (
        filtered.map((category) => {
          const isOpen = isSearching || openCategory === category.id;
          return (
            <div key={category.id} className={styles.category}>
              <button
                className={styles.categoryHeader}
                onClick={() => setOpenCategory(isOpen && !isSearching ? null : category.id)}
              >
                <span>{category.label}</span>
                <span className={styles.chevron}>{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div className={styles.entries}>
                  {category.entries.map((entry) => (
                    <details key={entry.q} className={styles.entry}>
                      <summary className={styles.question}>{entry.q}</summary>
                      <p className={styles.answer}>{entry.a}</p>
                    </details>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
