import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DailyViewsChart from '../analytics/DailyViewsChart';
import { formatBytes, formatViews } from '../../lib/formatDuration';
import { fetchAnalyticsOverview } from './adminApi';
import shared from './AdminShared.module.css';

function formatWatchTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAnalyticsOverview()
      .then(setData)
      .catch(() => setData(false));
  }, []);

  if (data === null) return <p>Loading…</p>;
  if (data === false) return <p className={shared.empty}>Could not load analytics.</p>;

  return (
    <div>
      <h1 className={shared.heading}>Analytics</h1>
      <p className={shared.hint}>
        Watch Time and Storage Growth are computed on demand from existing timestamps rather than tracked as a live
        time-series — Watch Time in particular approximates engagement from each viewer's furthest-reached position
        per video, since no per-view duration is logged.
      </p>

      <div className={shared.statGrid}>
        <div className={shared.statCard}>
          <p className={shared.statLabel}>Approx. Watch Time</p>
          <p className={shared.statValue}>{formatWatchTime(data.approxWatchTimeSeconds)}</p>
        </div>
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>New Users (30d)</h2>
        <DailyViewsChart days={data.newUsersByDay} />
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Video Uploads (30d)</h2>
        <DailyViewsChart days={data.uploadsByDay} />
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Storage Growth (30d)</h2>
        <DailyViewsChart days={data.storageGrowth.map((d) => ({ date: d.date, count: d.totalBytes }))} />
        <p className={shared.hint}>
          Latest: {formatBytes(data.storageGrowth[data.storageGrowth.length - 1]?.totalBytes || 0)} cumulative
        </p>
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Most Viewed Videos</h2>
        {data.mostViewed.length === 0 ? (
          <p className={shared.empty}>No videos yet.</p>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Uploader</th>
                  <th>Views</th>
                </tr>
              </thead>
              <tbody>
                {data.mostViewed.map((v) => (
                  <tr key={v._id}>
                    <td>
                      <Link to={`/watch/${v._id}`}>{v.title}</Link>
                    </td>
                    <td>{v.uploader?.username || '—'}</td>
                    <td>{formatViews(v.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
