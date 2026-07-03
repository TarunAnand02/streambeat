import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import VideoCard from '../../components/VideoCard';
import VideoCardSkeleton from '../../components/VideoCardSkeleton';
import { useAuth } from '../../hooks/useAuth';
import { fetchCollections } from '../collections/collectionsApi';
import { bulkVideoAction, deleteVideo } from '../videos/videosApi';
import { fetchChannel } from './channelApi';
import styles from './ChannelPage.module.css';

export default function ChannelPage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [collections, setCollections] = useState([]);
  const [addToCollectionId, setAddToCollectionId] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchChannel(userId).then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isOwner = user?.id === userId;

  useEffect(() => {
    if (selectMode && isOwner && collections.length === 0) {
      fetchCollections().then(setCollections);
    }
  }, [selectMode, isOwner, collections.length]);

  async function handleDelete(videoId) {
    if (!window.confirm('Delete this video? This cannot be undone.')) return;
    await deleteVideo(videoId);
    setData((prev) => ({
      ...prev,
      videos: prev.videos.filter((v) => v._id !== videoId),
    }));
  }

  function toggleSelected(videoId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} video(s)? This cannot be undone.`)) return;
    setBulkBusy(true);
    try {
      await bulkVideoAction({ videoIds: [...selectedIds], action: 'delete' });
      setData((prev) => ({
        ...prev,
        videos: prev.videos.filter((v) => !selectedIds.has(v._id)),
      }));
      exitSelectMode();
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkAddTags() {
    const input = window.prompt('Add tags (comma-separated):');
    if (!input) return;
    const tags = input
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tags.length) return;
    setBulkBusy(true);
    try {
      await bulkVideoAction({ videoIds: [...selectedIds], action: 'addTags', tags });
      exitSelectMode();
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkAddToCollection() {
    if (!addToCollectionId) return;
    setBulkBusy(true);
    try {
      await bulkVideoAction({
        videoIds: [...selectedIds],
        action: 'addToCollection',
        collectionId: addToCollectionId,
      });
      exitSelectMode();
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading || !data) return <VideoCardSkeleton />;

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.avatar}>{data.user.username.charAt(0).toUpperCase()}</div>
        <div className={styles.headerInfo}>
          <h1 className={styles.username}>{data.user.username}</h1>
          {data.user.bio && <p className={styles.bio}>{data.user.bio}</p>}
          {isOwner && <p className={styles.accountEmail}>{user.email}</p>}
        </div>
        {isOwner && data.videos.length > 0 && (
          <button
            className={styles.selectToggle}
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>
        )}
      </div>

      {selectMode && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selectedIds.size} selected</span>
          <button
            className={styles.bulkButton}
            onClick={handleBulkDelete}
            disabled={bulkBusy || selectedIds.size === 0}
          >
            Delete
          </button>
          <button
            className={styles.bulkButton}
            onClick={handleBulkAddTags}
            disabled={bulkBusy || selectedIds.size === 0}
          >
            Add Tag(s)
          </button>
          <select
            className={styles.bulkSelect}
            value={addToCollectionId}
            onChange={(e) => setAddToCollectionId(e.target.value)}
          >
            <option value="">Add to collection…</option>
            {collections.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            className={styles.bulkButton}
            onClick={handleBulkAddToCollection}
            disabled={bulkBusy || selectedIds.size === 0 || !addToCollectionId}
          >
            Apply
          </button>
        </div>
      )}

      {data.videos.length === 0 ? (
        <p>No videos uploaded yet.</p>
      ) : (
        <div className={styles.grid}>
          {data.videos.map((video, index) => (
            <div key={video._id} className={styles.gridItem}>
              <VideoCard
                video={{ ...video, uploader: data.user }}
                style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
                selectable={selectMode}
                selected={selectedIds.has(video._id)}
                onToggleSelect={toggleSelected}
              />
              {isOwner && !selectMode && (
                <button className={styles.deleteButton} onClick={() => handleDelete(video._id)}>
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
