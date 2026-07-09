import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatBytes, timeAgo } from '../../lib/formatDuration';
import { fetchDashboard } from './adminApi';
import shared from './AdminShared.module.css';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(() => setData(false));
  }, []);

  if (data === null) return <p>Loading…</p>;
  if (data === false) return <p className={shared.empty}>Could not load dashboard.</p>;

  const stats = [
    { label: 'Total Users', value: data.totalUsers },
    { label: `Active Users (${data.activeWindowDays}d)`, value: data.activeUsers },
    { label: 'Total Videos', value: data.totalVideos },
    { label: 'Total Storage Used', value: formatBytes(data.totalStorageBytes) },
    { label: 'Processing', value: data.uploadQueue.processing },
    { label: 'Failed Uploads', value: data.uploadQueue.failed },
  ];

  return (
    <div>
      <h1 className={shared.heading}>Dashboard</h1>

      <div className={shared.statGrid}>
        {stats.map((s) => (
          <div key={s.label} className={shared.statCard}>
            <p className={shared.statLabel}>{s.label}</p>
            <p className={shared.statValue}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>System Health</h2>
        <div className={shared.statGrid}>
          <div className={shared.statCard}>
            <p className={shared.statLabel}>Database</p>
            <p className={shared.statValue}>{data.systemHealth.dbConnected ? 'Connected' : 'Down'}</p>
          </div>
          <div className={shared.statCard}>
            <p className={shared.statLabel}>Server Uptime</p>
            <p className={shared.statValue}>{Math.floor(data.systemHealth.uptimeSeconds / 60)}m</p>
          </div>
        </div>
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Recent Uploads</h2>
        {data.recentUploads.length === 0 ? (
          <p className={shared.empty}>No uploads yet.</p>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Uploader</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {data.recentUploads.map((v) => (
                  <tr key={v._id}>
                    <td>
                      <Link to={`/watch/${v._id}`}>{v.title}</Link>
                    </td>
                    <td>{v.uploader?.username || '—'}</td>
                    <td>{v.transcodeStatus}</td>
                    <td>{timeAgo(v.createdAt)}</td>
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
