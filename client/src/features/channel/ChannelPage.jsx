import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import VideoCard from '../../components/VideoCard';
import VideoCardSkeleton from '../../components/VideoCardSkeleton';
import Avatar from '../../components/ui/Avatar';
import { CalendarIcon, MessageIcon, UploadIcon } from '../../components/ui/Icon';
import { useToast } from '../../components/toast/ToastProvider';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { timeAgo } from '../../lib/formatDuration';
import { fetchCollections } from '../collections/collectionsApi';
import { bulkVideoAction, deleteVideo } from '../videos/videosApi';
import { fetchChannel } from './channelApi';
import { subscribe, unsubscribe } from './subscriptionsApi';
import styles from './ChannelPage.module.css';

function formatJoinDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function ChannelPage() {
  const { userId } = useParams();
  const { user, isAuthenticated, initialized } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [collections, setCollections] = useState([]);
  const [addToCollectionId, setAddToCollectionId] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [subBusy, setSubBusy] = useState(false);

  useEffect(() => {
    // Wait for session restore to resolve first — on a fresh page load,
    // fetching before the access token is back in Redux would otherwise
    // silently request this as an anonymous viewer (wrong isSubscribed).
    if (!initialized) return;
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
  }, [userId, initialized]);

  const isOwner = user?.id === userId;

  useEffect(() => {
    if (selectMode && isOwner && collections.length === 0) {
      fetchCollections().then(setCollections);
    }
  }, [selectMode, isOwner, collections.length]);

  async function handleToggleSubscribe() {
    if (!isAuthenticated) return navigate('/login');
    setSubBusy(true);
    try {
      if (data.isSubscribed) {
        await unsubscribe(userId);
      } else {
        await subscribe(userId);
      }
      setData((prev) => ({
        ...prev,
        isSubscribed: !prev.isSubscribed,
        subscriberCount: prev.subscriberCount + (prev.isSubscribed ? -1 : 1),
      }));
    } finally {
      setSubBusy(false);
    }
  }

  async function handleDelete(videoId) {
    if (!window.confirm('Delete this video? This cannot be undone.')) return;
    try {
      await deleteVideo(videoId);
      setData((prev) => ({
        ...prev,
        videos: prev.videos.filter((v) => v._id !== videoId),
      }));
      showToast('Video deleted', { type: 'success' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete video', { type: 'error' });
    }
  }

  function handleVideoUpdated(updated) {
    setData((prev) => ({
      ...prev,
      videos: prev.videos.map((v) => (v._id === updated._id ? { ...v, ...updated } : v)),
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
      const count = selectedIds.size;
      await bulkVideoAction({ videoIds: [...selectedIds], action: 'delete' });
      setData((prev) => ({
        ...prev,
        videos: prev.videos.filter((v) => !selectedIds.has(v._id)),
      }));
      exitSelectMode();
      showToast(`${count} video${count === 1 ? '' : 's'} deleted`, { type: 'success' });
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

  useDocumentMeta(
    data?.user?.username,
    data?.user?.bio || (data?.user?.username ? `${data.user.username}'s channel on StreamBeat` : undefined)
  );

  if (loading || !data) return <VideoCardSkeleton />;

  return (
    <div>
      <div className={styles.header}>
        <Avatar
          username={data.user.username}
          avatarUrl={data.user.avatarUrl}
          size={80}
          className={styles.avatar}
        />
        <div className={styles.headerInfo}>
          <h1 className={styles.username}>{data.user.username}</h1>
          <p className={styles.statsRow}>
            <span>{data.videos.length} video{data.videos.length === 1 ? '' : 's'}</span>
            <span>·</span>
            <span>
              {data.subscriberCount} follower{data.subscriberCount === 1 ? '' : 's'}
            </span>
            {data.user.createdAt && (
              <>
                <span>·</span>
                <span className={styles.joinedRow}>
                  <CalendarIcon className={styles.inlineIcon} /> Joined {formatJoinDate(data.user.createdAt)}
                </span>
              </>
            )}
          </p>
          {data.user.bio && <p className={styles.bio}>{data.user.bio}</p>}
          {isOwner && <p className={styles.accountEmail}>{user.email}</p>}
        </div>
        {!isOwner && (
          <button
            className={data.isSubscribed ? styles.subscribedButton : styles.subscribeButton}
            onClick={handleToggleSubscribe}
            disabled={subBusy}
          >
            {data.isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        )}
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
                showSaveTo={isOwner && !selectMode}
                onVideoUpdated={handleVideoUpdated}
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

      {data.activity?.length > 0 && (
        <div className={styles.activitySection}>
          <h2 className={styles.activityHeading}>Recent activity</h2>
          <ul className={styles.activityList}>
            {data.activity.map((item, i) => (
              <li key={i} className={styles.activityItem}>
                <span className={styles.activityIcon}>
                  {item.type === 'upload' ? <UploadIcon /> : <MessageIcon />}
                </span>
                <span className={styles.activityText}>
                  {item.type === 'upload' ? (
                    <>
                      Uploaded{' '}
                      <Link className={styles.activityLink} to={`/watch/${item.video._id}`}>
                        {item.video.title}
                      </Link>
                    </>
                  ) : (
                    <>
                      Commented on{' '}
                      <Link className={styles.activityLink} to={`/watch/${item.video._id}`}>
                        {item.video.title}
                      </Link>
                      : “{item.text}”
                    </>
                  )}
                </span>
                <span className={styles.activityTime}>{timeAgo(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
