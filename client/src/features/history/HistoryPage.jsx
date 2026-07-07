import { useEffect, useState } from 'react';
import VideoCard from '../../components/VideoCard';
import Spinner from '../../components/ui/Spinner';
import uploadStyles from '../videos/UploadPage.module.css';
import { getCategory } from '../videos/categories';
import { clearHistory, fetchHistory, fetchWeeklySummary, removeHistoryEntry } from './historyApi';
import styles from './HistoryPage.module.css';

export default function HistoryPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchHistory().then((data) => {
      if (!cancelled) {
        setVideos(data);
        setLoading(false);
      }
    });
    fetchWeeklySummary().then((data) => {
      if (!cancelled) setSummary(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClear() {
    if (!window.confirm('Clear your entire watch history? This cannot be undone.')) return;
    await clearHistory();
    setVideos([]);
    setSummary({ totalMinutes: 0, videosWatched: 0, topCategory: null });
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

      {summary && summary.videosWatched > 0 && (
        <div className={styles.summaryCard}>
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{summary.totalMinutes}</span>
            <span className={styles.summaryLabel}>minutes this week</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{summary.videosWatched}</span>
            <span className={styles.summaryLabel}>videos watched</span>
          </div>
          {summary.topCategory && (
            <div className={styles.summaryStat}>
              <span className={styles.summaryValue}>
                {getCategory(summary.topCategory)?.emoji} {getCategory(summary.topCategory)?.label}
              </span>
              <span className={styles.summaryLabel}>top category</span>
            </div>
          )}
        </div>
      )}

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
