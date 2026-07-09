import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/toast/ToastProvider';
import { formatBytes } from '../../lib/formatDuration';
import { cleanOrphanFiles, fetchStorageOverview, scanOrphanFiles } from './adminApi';
import shared from './AdminShared.module.css';

export default function AdminStoragePage() {
  const [overview, setOverview] = useState(null);
  const [orphans, setOrphans] = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const showToast = useToast();

  function loadOverview() {
    fetchStorageOverview()
      .then(setOverview)
      .catch(() => showToast('Could not load storage overview', { type: 'error' }));
  }

  useEffect(loadOverview, []); // eslint-disable-line react-hooks/exhaustive-deps

  function loadOrphans() {
    setOrphans(null);
    scanOrphanFiles()
      .then(setOrphans)
      .catch(() => showToast('Could not scan for orphaned files', { type: 'error' }));
  }

  async function handleClean() {
    if (!window.confirm('Delete all orphaned local files? This cannot be undone.')) return;
    setCleaning(true);
    try {
      const result = await cleanOrphanFiles();
      showToast(`Removed ${result.removed} file(s), freed ${formatBytes(result.freedBytes)}`);
      setOrphans({ orphans: [], totalBytes: 0, count: 0 });
    } catch {
      showToast('Could not clean orphaned files', { type: 'error' });
    } finally {
      setCleaning(false);
    }
  }

  if (!overview) return <p>Loading…</p>;

  return (
    <div>
      <h1 className={shared.heading}>Storage</h1>

      <div className={shared.statGrid}>
        <div className={shared.statCard}>
          <p className={shared.statLabel}>Total Usage</p>
          <p className={shared.statValue}>{formatBytes(overview.totalBytes)}</p>
        </div>
        <div className={shared.statCard}>
          <p className={shared.statLabel}>Videos</p>
          <p className={shared.statValue}>{overview.videoCount}</p>
        </div>
        <div className={shared.statCard}>
          <p className={shared.statLabel}>Duplicate Groups</p>
          <p className={shared.statValue}>{overview.duplicateGroups}</p>
        </div>
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Largest Videos</h2>
        {overview.largestVideos.length === 0 ? (
          <p className={shared.empty}>No uploads yet.</p>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Uploader</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {overview.largestVideos.map((v) => (
                  <tr key={v._id}>
                    <td>
                      <Link to={`/watch/${v._id}`}>{v.title}</Link>
                    </td>
                    <td>{v.uploader?.username || '—'}</td>
                    <td>{formatBytes(v.sizeBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Top Storage Consumers</h2>
        {overview.topConsumers.length === 0 ? (
          <p className={shared.empty}>No uploads yet.</p>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Videos</th>
                  <th>Total Size</th>
                </tr>
              </thead>
              <tbody>
                {overview.topConsumers.map((c) => (
                  <tr key={c.userId}>
                    <td>
                      <Link to={`/channel/${c.userId}`}>{c.username}</Link>
                    </td>
                    <td>{c.videoCount}</td>
                    <td>{formatBytes(c.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Clean Temporary / Orphan Files</h2>
        <p className={shared.hint}>
          Local storage only — files kept in R2 aren't scanned. A file is only flagged if it's over an hour old, so
          an upload still in progress is never mistaken for an orphan.
        </p>
        <div className={shared.toolbar}>
          <button type="button" className={shared.actionButton} onClick={loadOrphans}>
            Scan for orphaned files
          </button>
          {orphans && orphans.count > 0 && (
            <button type="button" className={shared.actionButtonDanger} disabled={cleaning} onClick={handleClean}>
              Remove {orphans.count} file(s) ({formatBytes(orphans.totalBytes)})
            </button>
          )}
        </div>
        {orphans && orphans.count === 0 && <p className={shared.empty}>No orphaned files found.</p>}
      </div>
    </div>
  );
}
