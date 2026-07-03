import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { createHelpArticle, deleteHelpArticle, fetchHelpArticles, updateHelpArticle } from './helpApi';
import styles from './HelpPage.module.css';

function ArticleEntry({ entry, isAdmin, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(entry.question);
  const [answer, setAnswer] = useState(entry.answer);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateHelpArticle(entry._id, { question, answer });
      onSaved(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this help article?')) return;
    await deleteHelpArticle(entry._id);
    onDeleted(entry._id);
  }

  if (editing) {
    return (
      <div className={styles.entry}>
        <input className={styles.editInput} value={question} onChange={(e) => setQuestion(e.target.value)} />
        <textarea
          className={styles.editTextarea}
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <div className={styles.editActions}>
          <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className={styles.cancelButton} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <details className={styles.entry}>
      <summary className={styles.question}>
        {entry.question}
        {isAdmin && (
          <span className={styles.adminActions}>
            <button
              type="button"
              className={styles.adminButton}
              onClick={(e) => {
                e.preventDefault();
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className={styles.adminButton}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              Delete
            </button>
          </span>
        )}
      </summary>
      <p className={styles.answer}>{entry.answer}</p>
    </details>
  );
}

function AddArticleForm({ defaultCategory, onAdded }) {
  const [category, setCategory] = useState(defaultCategory || '');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const article = await createHelpArticle({ category: category.trim(), question, answer });
      onAdded(article);
      setQuestion('');
      setAnswer('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.addForm} onSubmit={handleSubmit}>
      <input
        className={styles.editInput}
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        required
      />
      <input
        className={styles.editInput}
        placeholder="Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        required
      />
      <textarea
        className={styles.editTextarea}
        placeholder="Answer"
        rows={3}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        required
      />
      <button className={styles.saveButton} type="submit" disabled={saving}>
        {saving ? 'Adding…' : '+ Add article'}
      </button>
    </form>
  );
}

export default function HelpPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [openCategory, setOpenCategory] = useState(null);

  useEffect(() => {
    fetchHelpArticles().then((data) => {
      setCategories(data);
      setOpenCategory(data[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  function handleArticleSaved(updated) {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        entries: cat.entries.map((e) => (e._id === updated._id ? updated : e)),
      }))
    );
  }

  function handleArticleDeleted(id) {
    setCategories((prev) =>
      prev.map((cat) => ({ ...cat, entries: cat.entries.filter((e) => e._id !== id) })).filter((cat) => cat.entries.length > 0)
    );
  }

  function handleArticleAdded(article) {
    setCategories((prev) => {
      const existing = prev.find((cat) => cat.id === article.category);
      if (existing) {
        return prev.map((cat) =>
          cat.id === article.category ? { ...cat, entries: [...cat.entries, article] } : cat
        );
      }
      return [...prev, { id: article.category, label: article.category, entries: [article] }];
    });
    setOpenCategory(article.category);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((category) => ({
        ...category,
        entries: category.entries.filter(
          (entry) => entry.question.toLowerCase().includes(q) || entry.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((category) => category.entries.length > 0);
  }, [categories, query]);

  const isSearching = query.trim().length > 0;

  if (loading) return null;

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
                    <ArticleEntry
                      key={entry._id}
                      entry={entry}
                      isAdmin={isAdmin}
                      onSaved={handleArticleSaved}
                      onDeleted={handleArticleDeleted}
                    />
                  ))}
                  {isAdmin && <AddArticleForm defaultCategory={category.label} onAdded={handleArticleAdded} />}
                </div>
              )}
            </div>
          );
        })
      )}

      {isAdmin && !isSearching && (
        <div className={styles.category}>
          <div className={styles.categoryHeader}>
            <span>+ New category</span>
          </div>
          <div className={styles.entries}>
            <AddArticleForm onAdded={handleArticleAdded} />
          </div>
        </div>
      )}
    </div>
  );
}
