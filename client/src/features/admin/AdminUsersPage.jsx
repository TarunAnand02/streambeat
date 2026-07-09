import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/toast/ToastProvider';
import { timeAgo } from '../../lib/formatDuration';
import {
  activateUser,
  deleteAdminUser,
  fetchUsers,
  suspendUser,
  updateAdminUser,
} from './adminApi';
import shared from './AdminShared.module.css';

export default function AdminUsersPage() {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ username: '', email: '', bio: '' });
  const showToast = useToast();

  function load() {
    fetchUsers({ page, q: q || undefined, status: status || undefined })
      .then(setResult)
      .catch(() => showToast('Could not load users', { type: 'error' }));
  }

  useEffect(load, [page, status]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function startEdit(u) {
    setEditingId(u._id);
    setEditDraft({ username: u.username, email: u.email, bio: u.bio || '' });
  }

  async function saveEdit(id) {
    setBusyId(id);
    try {
      const updated = await updateAdminUser(id, editDraft);
      setResult((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u._id === id ? { ...u, ...updated } : u)),
      }));
      setEditingId(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update user', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleSuspend(u) {
    const reason = window.prompt(`Suspend ${u.username} — optional reason:`);
    if (reason === null) return;
    setBusyId(u._id);
    try {
      const updated = await suspendUser(u._id, reason || undefined);
      setResult((prev) => ({
        ...prev,
        users: prev.users.map((x) => (x._id === u._id ? { ...x, ...updated } : x)),
      }));
    } catch {
      showToast('Could not suspend user', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleActivate(u) {
    setBusyId(u._id);
    try {
      const updated = await activateUser(u._id);
      setResult((prev) => ({
        ...prev,
        users: prev.users.map((x) => (x._id === u._id ? { ...x, ...updated } : x)),
      }));
    } catch {
      showToast('Could not activate user', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Permanently delete '${u.username}' and everything they own? This cannot be undone.`)) {
      return;
    }
    setBusyId(u._id);
    try {
      await deleteAdminUser(u._id);
      setResult((prev) => ({ ...prev, users: prev.users.filter((x) => x._id !== u._id) }));
      showToast(`Deleted ${u.username}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete user', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  if (!result) return <p>Loading…</p>;

  return (
    <div>
      <h1 className={shared.heading}>Users</h1>

      <form className={shared.toolbar} onSubmit={handleSearchSubmit}>
        <input
          type="text"
          className={shared.searchInput}
          placeholder="Search username or email"
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
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="admin">Admins</option>
        </select>
        <button type="submit" className={shared.actionButtonPrimary}>
          Search
        </button>
      </form>

      {result.users.length === 0 ? (
        <p className={shared.empty}>No users found.</p>
      ) : (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.users.map((u) => (
                <tr key={u._id}>
                  {editingId === u._id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={editDraft.username}
                          onChange={(e) => setEditDraft((d) => ({ ...d, username: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editDraft.email}
                          onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
                        />
                      </td>
                      <td colSpan={2}>
                        <input
                          type="text"
                          placeholder="Bio"
                          value={editDraft.bio}
                          onChange={(e) => setEditDraft((d) => ({ ...d, bio: e.target.value }))}
                        />
                      </td>
                      <td />
                      <td className={shared.actionRow}>
                        <button
                          type="button"
                          className={shared.actionButtonPrimary}
                          disabled={busyId === u._id}
                          onClick={() => saveEdit(u._id)}
                        >
                          Save
                        </button>
                        <button type="button" className={shared.actionButton} onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <Link to={`/channel/${u._id}`}>{u.username}</Link>
                        {u.isAdmin && <span className={shared.badge + ' ' + shared.badgeGood}> admin</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        {u.suspended ? (
                          <span className={`${shared.badge} ${shared.badgeDanger}`} title={u.suspendedReason || ''}>
                            Suspended
                          </span>
                        ) : (
                          <span className={`${shared.badge} ${shared.badgeGood}`}>Active</span>
                        )}
                      </td>
                      <td>{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</td>
                      <td>{timeAgo(u.createdAt)}</td>
                      <td className={shared.actionRow}>
                        <button type="button" className={shared.actionButton} onClick={() => startEdit(u)}>
                          Edit
                        </button>
                        {u.suspended ? (
                          <button
                            type="button"
                            className={shared.actionButton}
                            disabled={busyId === u._id}
                            onClick={() => handleActivate(u)}
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={shared.actionButton}
                            disabled={busyId === u._id}
                            onClick={() => handleSuspend(u)}
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          type="button"
                          className={shared.actionButtonDanger}
                          disabled={busyId === u._id}
                          onClick={() => handleDelete(u)}
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
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
