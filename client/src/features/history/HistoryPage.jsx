import { useEffect, useState } from 'react';
import VideoCard from '../../components/VideoCard';
import Spinner from '../../components/ui/Spinner';
import uploadStyles from '../videos/UploadPage.module.css';
import { clearHistory, fetchHistory, removeHistoryEntry } from './historyApi';
import styles from './HistoryPage.module.css';

export default function HistoryPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchHistory().then((data) => {
      if (!cancelled) {
        setVideos(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClear() {
    if (!window.confirm('Clear your entire watch history? This cannot be undone.')) return;
    await clearHistory();
    setVideos([]);
  }

  async function handleRemove(videoId) {
    await removeHistoryEntry(videoId);
    setVideos((prev) => prev.filter((v) => v._id !== videoId));
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={uploadStyles.heading}>Watch history</h1>
        {videos.length > 0 && (
          <button className={styles.clearButton} onClick={handleClear}>
            Clear all
          </button>
        )}
      </div>

      {videos.length === 0 ? (
        <p className={styles.empty}>Videos you watch will show up here.</p>
      ) : (
        <div className={styles.grid}>
          {videos.map((video, index) => (
            <div key={video._id} className={styles.gridItem}>
              <VideoCard video={video} style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }} />
              <button className={styles.removeButton} onClick={() => handleRemove(video._id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
