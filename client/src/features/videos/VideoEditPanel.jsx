import { useEffect, useState } from 'react';
import { fetchCollections } from '../collections/collectionsApi';
import { updateVideo } from './videosApi';
import styles from './VideoEditPanel.module.css';

export default function VideoEditPanel({ video, onSaved }) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState(video.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [collections, setCollections] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState(
    () => new Set((video.collections || []).map(String))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && collections.length === 0) {
      // Viewer-role shared collections aren't writable — only show ones the
      // user can actually add this video to.
      fetchCollections().then((all) => setCollections(all.filter((c) => c.role !== 'viewer')));
    }
  }, [open, collections.length]);

  function addTag() {
    const value = tagInput.trim().toLowerCase();
    if (value && !tags.includes(value)) setTags([...tags, value]);
    setTagInput('');
  }

  function removeTag(tag) {
    setTags(tags.filter((t) => t !== tag));
  }

  function toggleCollection(id) {
    setSelectedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const updated = await updateVideo(video._id, {
        tags,
        collections: [...selectedCollections],
      });
      onSaved(updated);
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className={styles.toggleButton} onClick={() => setOpen(true)}>
        Edit tags &amp; collections
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Tags</div>
        <div className={styles.tagList}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)}>
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className={styles.tagInputRow}>
          <input
            className={styles.tagInput}
            placeholder="Add a tag…"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <button type="button" className={styles.addTagButton} onClick={addTag}>
            Add
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Collections</div>
        {collections.length === 0 ? (
          <p className={styles.hint}>You don't have any collections yet.</p>
        ) : (
          <div className={styles.collectionList}>
            {collections.map((collection) => (
              <label key={collection._id} className={styles.collectionItem}>
                <input
                  type="checkbox"
                  checked={selectedCollections.has(collection._id)}
                  onChange={() => toggleCollection(collection._id)}
                />
                {collection.name}
                {collection.role === 'editor' && ' (shared)'}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actionsRow}>
        <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className={styles.cancelButton} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
