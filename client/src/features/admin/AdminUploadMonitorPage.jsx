import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/toast/ToastProvider';
import { timeAgo } from '../../lib/formatDuration';
import { cancelStuckJob, fetchUploadQueue, retryUpload } from './adminApi';
import shared from './AdminShared.module.css';

export default function AdminUploadMonitorPage() {
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const showToast = useToast();

  function load() {
    fetchUploadQueue()
      .then(setData)
      .catch(() => showToast('Could not load the upload queue', { type: 'error' }));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRetry(v) {
    setBusyId(v._id);
    try {
      await retryUpload(v._id);
      showToast('Retry started');
      setData((prev) => ({ ...prev, failed: prev.failed.filter((x) => x._id !== v._id) }));
    } catch {
      showToast('Could not retry upload', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(v) {
    if (!window.confirm(`Cancel '${v.title}'? This can't stop an in-flight ffmpeg job, only stop it from showing as stuck — you can retry it afterward.`)) {
      return;
    }
    setBusyId(v._id);
    try {
      await cancelStuckJob(v._id);
      setData((prev) => ({
        ...prev,
        processing: prev.processing.filter((x) => x._id !== v._id),
        failed: [...prev.failed, { ...v, transcodeStatus: 'failed' }],
      }));
    } catch {
      showToast('Could not cancel job', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  if (!data) return <p>Loading…</p>;

  return (
    <div>
      <h1 className={shared.heading}>Upload Monitor</h1>
      <p className={shared.hint}>
        There's no live handle to an in-flight transcode job — "stuck" is inferred from a row sitting in
        "processing" for over 30 minutes, and Cancel just marks it failed so it can be retried.
      </p>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Processing Queue ({data.processing.length})</h2>
        {data.processing.length === 0 ? (
          <p className={shared.empty}>Nothing is processing right now.</p>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Uploader</th>
                  <th>Started</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.processing.map((v) => (
                  <tr key={v._id}>
                    <td>
                      <Link to={`/watch/${v._id}`}>{v.title}</Link>
                    </td>
                    <td>{v.uploader?.username || '—'}</td>
                    <td>{timeAgo(v.createdAt)}</td>
                    <td>
                      {v.stuck ? (
                        <span className={`${shared.badge} ${shared.badgeDanger}`}>Stuck</span>
                      ) : (
                        <span className={`${shared.badge} ${shared.badgeWarn}`}>Processing</span>
                      )}
                    </td>
                    <td className={shared.actionRow}>
                      <button
                        type="button"
                        className={shared.actionButtonDanger}
                        disabled={busyId === v._id}
                        onClick={() => handleCancel(v)}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Failed ({data.failed.length})</h2>
        {data.failed.length === 0 ? (
          <p className={shared.empty}>No failed uploads.</p>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Uploader</th>
                  <th>Failed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.failed.map((v) => (
                  <tr key={v._id}>
                    <td>
                      <Link to={`/watch/${v._id}`}>{v.title}</Link>
                    </td>
                    <td>{v.uploader?.username || '—'}</td>
                    <td>{timeAgo(v.updatedAt)}</td>
                    <td className={shared.actionRow}>
                      <button
                        type="button"
                        className={shared.actionButtonPrimary}
                        disabled={busyId === v._id}
                        onClick={() => handleRetry(v)}
                      >
                        Retry
                      </button>
                    </td>
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
