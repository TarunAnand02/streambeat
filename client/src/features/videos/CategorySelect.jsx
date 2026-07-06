import { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { createCategory } from './categoriesApi';
import styles from './CategorySelect.module.css';

const CREATE_VALUE = '__create__';

// Drop-in replacement for a plain <select> bound to the fixed categories.js
// list — fetches the real (DB-backed, creatable-at-runtime) category list
// instead, and offers a "+ Create new category…" option that reveals an
// inline name field right in place of the dropdown.
export default function CategorySelect({ id, value, onChange, className, disabled }) {
  const { categories, loading, addCategory } = useCategories();
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function handleSelectChange(e) {
    if (e.target.value === CREATE_VALUE) {
      setError(null);
      setCreating(true);
      return;
    }
    onChange(e.target.value);
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;

    // Instant feedback against what's already loaded — the server remains
    // the source of truth and safely returns the existing category instead
    // of erroring on a slugified collision this check couldn't catch.
    const dupe = categories.find((c) => c.label.toLowerCase() === label.toLowerCase());
    if (dupe) {
      onChange(dupe.id);
      setCreating(false);
      setNewLabel('');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const category = await createCategory(label);
      addCategory(category);
      onChange(category.id);
      setCreating(false);
      setNewLabel('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create category');
    } finally {
      setBusy(false);
    }
  }

  if (creating) {
    return (
      <form className={styles.createRow} onSubmit={handleCreateSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        <input
          className={className}
          autoFocus
          placeholder="New category name…"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          maxLength={40}
        />
        <button type="submit" className={styles.confirmButton} disabled={busy || !newLabel.trim()}>
          {busy ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={() => {
            setCreating(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <select
      id={id}
      className={className}
      value={value}
      disabled={disabled || loading}
      onChange={handleSelectChange}
      aria-label="Category"
    >
      {loading && <option>Loading…</option>}
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.emoji} {cat.label}
        </option>
      ))}
      <option value={CREATE_VALUE}>+ Create new category…</option>
    </select>
  );
}
