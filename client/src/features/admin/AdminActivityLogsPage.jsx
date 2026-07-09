import { useEffect, useState } from 'react';
import { timeAgo } from '../../lib/formatDuration';
import { fetchActivityLogs } from './adminApi';
import shared from './AdminShared.module.css';

const ACTIONS = [
  'admin_login',
  'user_edit',
  'user_suspend',
  'user_activate',
  'user_delete',
  'video_delete',
  'video_restore',
  'video_visibility_change',
  'video_reprocess',
  'video_edit',
  'settings_change',
  'storage_cleanup',
];

export default function AdminActivityLogsPage() {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  useEffect(() => {
    fetchActivityLogs({ page, action: action || undefined })
      .then(setResult)
      .catch(() => setResult(false));
  }, [page, action]);

  return (
    <div>
      <h1 className={shared.heading}>Activity Logs</h1>

      <div className={shared.toolbar}>
        <select
          className={shared.selectInput}
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {result === null ? (
        <p>Loading…</p>
      ) : result === false ? (
        <p className={shared.empty}>Could not load activity logs.</p>
      ) : result.logs.length === 0 ? (
        <p className={shared.empty}>No activity recorded yet.</p>
      ) : (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {result.logs.map((log) => (
                <tr key={log._id}>
                  <td>{timeAgo(log.createdAt)}</td>
                  <td>{log.actor?.username || '—'}</td>
                  <td>
                    <span className={`${shared.badge} ${shared.badgeNeutral}`}>{log.action}</span>
                  </td>
                  <td>{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.pages > 1 && (
        <div className={shared.pagination}>
          <button
            type="button"
            className={shared.actionButton}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {result.page} of {result.pages}
          </span>
          <button
            type="button"
            className={shared.actionButton}
            disabled={page >= result.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
