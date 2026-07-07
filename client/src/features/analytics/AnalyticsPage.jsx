import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../components/ui/Spinner';
import { formatBytes, formatViews } from '../../lib/formatDuration';
import { fetchStorageStats } from '../settings/settingsApi';
import uploadStyles from '../videos/UploadPage.module.css';
import { fetchChannelAnalytics } from './analyticsApi';
import CategoryBreakdown from './CategoryBreakdown';
import styles from './AnalyticsPage.module.css';
import DailyViewsChart from './DailyViewsChart';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchChannelAnalytics().then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    fetchStorageStats().then((result) => {
      if (!cancelled) setStorage(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data) return <Spinner />;

  if (data.totalVideos === 0) {
    return (
      <div>
        <h1 className={uploadStyles.heading}>Analytics</h1>
        <p className={styles.empty}>Upload or import a video to start seeing analytics here.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={uploadStyles.heading}>Analytics</h1>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{formatViews(data.totalViews)}</div>
          <div className={styles.summaryLabel}>Total views</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{data.totalLikes}</div>
          <div className={styles.summaryLabel}>Total likes</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{data.totalVideos}</div>
          <div className={styles.summaryLabel}>Videos</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{data.totalComments}</div>
          <div className={styles.summaryLabel}>Comments</div>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Views — last 30 days</h2>
        <DailyViewsChart days={data.viewsByDay} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Top videos</h2>
        <ul className={styles.topList}>
          {data.topVideos.map((video) => (
            <li key={video._id} className={styles.topItem}>
              <Link className={styles.topTitle} to={`/watch/${video._id}`}>
                {video.title}
              </Link>
              <span className={styles.topStats}>
                {formatViews(video.views)} · {video.likesCount} like{video.likesCount === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Views by category</h2>
        <CategoryBreakdown rows={data.viewsByCategory} />
      </section>

      {storage && storage.videoCount > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Storage</h2>
          <p className={styles.storageTotal}>
            {formatBytes(storage.totalBytes)} used across {storage.videoCount} upload
            {storage.videoCount === 1 ? '' : 's'}
          </p>

          {storage.largestVideos.length > 0 && (
            <>
              <h3 className={styles.storageSubheading}>Largest videos</h3>
              <ul className={styles.topList}>
                {storage.largestVideos.map((video) => (
                  <li key={video._id} className={styles.topItem}>
                    <Link className={styles.topTitle} to={`/watch/${video._id}`}>
                      {video.title}
                    </Link>
                    <span className={styles.topStats}>{formatBytes(video.sizeBytes)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {storage.duplicates.length > 0 && (
            <>
              <h3 className={styles.storageSubheading}>Possible duplicate uploads</h3>
              <p className={styles.hint}>
                These share identical file content — safe to delete the extras.
              </p>
              {storage.duplicates.map((group) => (
                <ul key={group[0]._id} className={styles.duplicateGroup}>
                  {group.map((video) => (
                    <li key={video._id} className={styles.topItem}>
                      <Link className={styles.topTitle} to={`/watch/${video._id}`}>
                        {video.title}
                      </Link>
                      <span className={styles.topStats}>{formatBytes(video.sizeBytes)}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </>
          )}
        </section>
      )}
    </div>
  );
}
