import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkFilledIcon, BookmarkIcon } from '../../components/ui/Icon';
import { updateVideo } from '../videos/videosApi';
import { fetchCollections } from './collectionsApi';
import styles from './SaveToCollectionMenu.module.css';

// Quick "Save to..." popover for toggling a single video's collection
// membership in place, without opening the full edit panel. Used both as an
// icon-only overlay on VideoCard and as a labeled button on WatchPage.
export default function SaveToCollectionMenu({ video, onUpdated, variant = 'icon' }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  // Local optimistic copy of membership — the checkbox needs to flip the
  // instant you click it, not wait on the update round-trip, otherwise a
  // controlled checkbox bound directly to the (stale) video prop just snaps
  // back until the parent re-renders with the server's response.
  const [memberIds, setMemberIds] = useState(() => new Set((video.collections || []).map(String)));
  const wrapperRef = useRef(null);

  useEffect(() => {
    setMemberIds(new Set((video.collections || []).map(String)));
  }, [video._id, video.collections]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open && collections === null) {
      fetchCollections().then((all) => setCollections(all.filter((c) => c.role !== 'viewer')));
    }
  }, [open, collections]);

  const hasAny = memberIds.size > 0;

  function handleTriggerClick(e) {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  }

  async function toggle(collectionId) {
    setError(null);
    setBusyId(collectionId);
    const wasMember = memberIds.has(collectionId);
    const next = wasMember
      ? [...memberIds].filter((id) => id !== collectionId)
      : [...memberIds, collectionId];
    setMemberIds(new Set(next));
    try {
      const updated = await updateVideo(video._id, { collections: next });
      onUpdated?.(updated);
    } catch (err) {
      setMemberIds((prev) => {
        const reverted = new Set(prev);
        if (wasMember) reverted.add(collectionId);
        else reverted.delete(collectionId);
        return reverted;
      });
      setError(err.response?.data?.message || 'Could not update');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className={variant === 'icon' ? styles.iconWrapper : styles.labeledWrapper}
      ref={wrapperRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={variant === 'icon' ? styles.iconTrigger : styles.labeledTrigger}
        onClick={handleTriggerClick}
        aria-label="Save to collection"
        title="Save to collection"
      >
        {hasAny ? (
          <BookmarkFilledIcon className={styles.triggerIcon} />
        ) : (
          <BookmarkIcon className={styles.triggerIcon} />
        )}
        {variant === 'labeled' && 'Save'}
      </button>

      {open && (
        <div className={styles.menu}>
          <div className={styles.menuHeading}>Save to</div>
          {error && <div className={styles.error}>{error}</div>}
          {collections === null ? (
            <p className={styles.hint}>Loading…</p>
          ) : collections.length === 0 ? (
            <p className={styles.hint}>
              No collections yet. <Link to="/collections">Create one</Link>
            </p>
          ) : (
            <ul className={styles.list}>
              {collections.map((c) => (
                <li key={c._id}>
                  <label className={styles.item}>
                    <input
                      type="checkbox"
                      checked={memberIds.has(c._id)}
                      disabled={busyId === c._id}
                      onChange={() => toggle(c._id)}
                    />
                    {c.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
