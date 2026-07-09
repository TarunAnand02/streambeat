import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/toast/ToastProvider';
import { formatBytes, timeAgo } from '../../lib/formatDuration';
import {
  deleteAdminVideo,
  fetchAdminVideos,
  reprocessAdminVideo,
  restoreAdminVideo,
  updateAdminVideo,
} from './adminApi';
import shared from './AdminShared.module.css';

const VISIBILITIES = ['public', 'unlisted', 'private'];

export default function AdminVideosPage() {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('active');
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ title: '' });
  const showToast = useToast();

  function load() {
    fetchAdminVideos({ page, q: q || undefined, status })
      .then(setResult)
      .catch(() => showToast('Could not load videos', { type: 'error' }));
  }

  useEffect(load, [page, status]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function patchLocal(id, updates) {
    setResult((prev) => ({ ...prev, videos: prev.videos.map((v) => (v._id === id ? { ...v, ...updates } : v)) }));
  }

  async function handleVisibilityChange(v, visibility) {
    setBusyId(v._id);
    try {
      await updateAdminVideo(v._id, { visibility });
      patchLocal(v._id, { visibility });
    } catch {
      showToast('Could not change visibility', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(v) {
    setEditingId(v._id);
    setEditDraft({ title: v.title });
  }

  async function saveEdit(id) {
    setBusyId(id);
    try {
      await updateAdminVideo(id, editDraft);
      patchLocal(id, editDraft);
      setEditingId(null);
    } catch {
      showToast('Could not update video', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(v) {
    if (!window.confirm(`Hide '${v.title}' from the app? You can restore it later.`)) return;
    setBusyId(v._id);
    try {
      await deleteAdminVideo(v._id);
      if (status === 'active') {
        setResult((prev) => ({ ...prev, videos: prev.videos.filter((x) => x._id !== v._id) }));
      } else {
        patchLocal(v._id, { deletedAt: new Date().toISOString() });
      }
    } catch {
      showToast('Could not delete video', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(v) {
    setBusyId(v._id);
    try {
      await restoreAdminVideo(v._id);
      if (status === 'deleted') {
        setResult((prev) => ({ ...prev, videos: prev.videos.filter((x) => x._id !== v._id) }));
      } else {
        patchLocal(v._id, { deletedAt: null });
      }
    } catch {
      showToast('Could not restore video', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReprocess(v) {
    setBusyId(v._id);
    try {
      await reprocessAdminVideo(v._id);
      patchLocal(v._id, { transcodeStatus: 'processing' });
      showToast('Reprocessing started');
    } catch {
      showToast('Could not start reprocessing', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  if (!result) return <p>Loading…</p>;

  return (
    <div>
      <h1 className={shared.heading}>Videos</h1>

      <form className={shared.toolbar} onSubmit={handleSearchSubmit}>
        <input
          type="text"
          className={shared.searchInput}
          placeholder="Search by title"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={shared.selectInput}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="active">Active</option>
          <option value="deleted">Deleted</option>
          <option value="all">All</option>
        </select>
        <button type="submit" className={shared.actionButtonPrimary}>
          Search
        </button>
      </form>

      {result.videos.length === 0 ? (
        <p className={shared.empty}>No videos found.</p>
      ) : (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Uploader</th>
                <th>Visibility</th>
                <th>Status</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.videos.map((v) => (
                <tr key={v._id}>
                  <td>
                    {editingId === v._id ? (
                      <input
                        type="text"
                        value={editDraft.title}
                        onChange={(e) => setEditDraft({ title: e.target.value })}
                      />
                    ) : (
                      <Link to={`/watch/${v._id}`}>{v.title}</Link>
                    )}
                  </td>
                  <td>{v.uploader?.username || '—'}</td>
                  <td>
                    <select
                      className={shared.selectInput}
                      value={v.visibility}
                      disabled={busyId === v._id}
                      onChange={(e) => handleVisibilityChange(v, e.target.value)}
                    >
                      {VISIBILITIES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {v.deletedAt ? (
                      <span className={`${shared.badge} ${shared.badgeDanger}`}>Deleted</span>
                    ) : v.transcodeStatus === 'failed' ? (
                      <span className={`${shared.badge} ${shared.badgeDanger}`}>Failed</span>
                    ) : v.transcodeStatus === 'processing' ? (
                      <span className={`${shared.badge} ${shared.badgeWarn}`}>Processing</span>
                    ) : (
                      <span className={`${shared.badge} ${shared.badgeGood}`}>Ready</span>
                    )}
                  </td>
                  <td>{v.sizeBytes ? formatBytes(v.sizeBytes) : '—'}</td>
                  <td>{timeAgo(v.createdAt)}</td>
                  <td className={shared.actionRow}>
                    {editingId === v._id ? (
                      <>
                        <button
                          type="button"
                          className={shared.actionButtonPrimary}
                          disabled={busyId === v._id}
                          onClick={() => saveEdit(v._id)}
                        >
                          Save
                        </button>
                        <button type="button" className={shared.actionButton} onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className={shared.actionButton} onClick={() => startEdit(v)}>
                          Edit
                        </button>
                        {v.source === 'upload' && (
                          <button
                            type="button"
                            className={shared.actionButton}
                            disabled={busyId === v._id}
                            onClick={() => handleReprocess(v)}
                          >
                            Reprocess
                          </button>
                        )}
                        {v.deletedAt ? (
                          <button
                            type="button"
                            className={shared.actionButton}
                            disabled={busyId === v._id}
                            onClick={() => handleRestore(v)}
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={shared.actionButtonDanger}
                            disabled={busyId === v._id}
                            onClick={() => handleDelete(v)}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.pages > 1 && (
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
