import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import VideoCard from '../../components/VideoCard';
import VideoCardSkeleton from '../../components/VideoCardSkeleton';
import { PlayIcon } from '../../components/ui/Icon';
import { useToast } from '../../components/toast/ToastProvider';
import { removeFromWatchLater } from '../videos/videosApi';
import { fetchWatchLater } from './collectionsApi';
import styles from './CollectionDetailPage.module.css';

export default function WatchLaterPage() {
  const [videos, setVideos] = useState(null);
  const showToast = useToast();

  useEffect(() => {
    fetchWatchLater().then((data) => setVideos(data.videos));
  }, []);

  async function handleRemove(videoId) {
    try {
      await removeFromWatchLater(videoId);
      setVideos((prev) => prev.filter((v) => v._id !== videoId));
    } catch {
      showToast('Could not remove video', { type: 'error' });
    }
  }

  if (videos === null) return <VideoCardSkeleton />;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.name}>Watch Later</h1>
        <div className={styles.headerActions}>
          {videos.length > 0 && (
            <Link className={styles.playAllButton} to={`/watch/${videos[0]._id}`}>
              <PlayIcon className={styles.inlineIcon} /> Play all
            </Link>
          )}
        </div>
      </div>

      {videos.length === 0 ? (
        <p className={styles.empty}>
          Nothing saved yet — use the clock icon on any video's thumbnail to add it here.
        </p>
      ) : (
        <div className={styles.grid}>
          {videos.map((video, index) => (
            <div key={video._id} className={styles.gridItem}>
              <VideoCard video={video} style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }} />
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => handleRemove(video._id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
