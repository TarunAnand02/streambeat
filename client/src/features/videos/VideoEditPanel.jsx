import { useEffect, useRef, useState } from 'react';
import CategorySelect from './CategorySelect';
import { CloseIcon } from '../../components/ui/Icon';
import { fetchCollections } from '../collections/collectionsApi';
import { thumbnailUrl, updateCaption, updateThumbnail, updateVideo } from './videosApi';
import styles from './VideoEditPanel.module.css';

export default function VideoEditPanel({ video, onSaved }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || '');
  const [category, setCategory] = useState(video.category);
  const [visibility, setVisibility] = useState(video.visibility || 'public');
  const [tags, setTags] = useState(video.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [collections, setCollections] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState(
    () => new Set((video.collections || []).map(String))
  );
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [captionFile, setCaptionFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const captionInputRef = useRef(null);

  useEffect(() => {
    if (open && collections.length === 0) {
      // Viewer-role shared collections aren't writable — only show ones the
      // user can actually add this video to.
      fetchCollections().then((all) => setCollections(all.filter((c) => c.role !== 'viewer')));
    }
  }, [open, collections.length]);

  // Release the preview object URL when it's replaced or the panel unmounts,
  // so we're not silently leaking blob URLs every time someone picks a file.
  useEffect(() => {
    return () => {
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [thumbnailPreview]);

  function handleThumbnailPick(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }

  function handleCaptionPick(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCaptionFile(file);
  }

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
      let updated = await updateVideo(video._id, {
        title,
        description,
        category,
        visibility,
        tags,
        collections: [...selectedCollections],
      });
      if (thumbnailFile) {
        updated = await updateThumbnail(video._id, thumbnailFile);
      }
      if (captionFile) {
        updated = await updateCaption(video._id, captionFile);
      }
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
        Edit video details
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      {error && <div className={styles.error}>{error}</div>}

      {video.source === 'upload' && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Thumbnail</div>
          <div className={styles.thumbnailRow}>
            <button
              type="button"
              className={styles.thumbnailPicker}
              onClick={() => fileInputRef.current?.click()}
            >
              {thumbnailPreview ? (
                <img className={styles.thumbnailPreview} src={thumbnailPreview} alt="" />
              ) : video.thumbnailFilename ? (
                <img className={styles.thumbnailPreview} src={thumbnailUrl(video._id)} alt="" />
              ) : (
                <span className={styles.thumbnailPlaceholder}>+ Add thumbnail</span>
              )}
              <span className={styles.thumbnailOverlay}>Change</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleThumbnailPick}
              hidden
            />
          </div>
        </div>
      )}

      {video.source === 'upload' && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Captions</div>
          <p className={styles.hint}>
            {captionFile
              ? `Selected: ${captionFile.name}`
              : video.captionFilename
                ? 'A caption track is already set.'
                : 'No captions yet.'}
          </p>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => captionInputRef.current?.click()}
          >
            {video.captionFilename || captionFile ? 'Replace .vtt file' : 'Upload .vtt file'}
          </button>
          <input ref={captionInputRef} type="file" accept=".vtt" onChange={handleCaptionPick} hidden />
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Title</div>
        <input
          className={styles.textInput}
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Description</div>
        <textarea
          className={styles.textareaInput}
          value={description}
          maxLength={5000}
          rows={4}
          placeholder="Add a description…"
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Category</div>
        <CategorySelect className={styles.textInput} value={category} onChange={setCategory} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Visibility</div>
        <select
          className={styles.textInput}
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="public">Public — anyone can find and watch</option>
          <option value="unlisted">Unlisted — only people with the link</option>
          <option value="private">Private — only you</option>
        </select>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Tags</div>
        <div className={styles.tagList}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
                <CloseIcon />
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
        <button className={styles.saveButton} onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className={styles.cancelButton} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
