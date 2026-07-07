import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloseIcon } from '../../components/ui/Icon';
import { useToast } from '../../components/toast/ToastProvider';
import { timeAgo } from '../../lib/formatDuration';
import { describe } from './NotificationsMenu';
import {
  deleteNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationsReadBulk,
  restoreNotifications,
} from './notificationsApi';
import styles from './NotificationsPage.module.css';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'like', label: 'Likes' },
  { value: 'comment', label: 'Comments' },
  { value: 'reply', label: 'Replies' },
  { value: 'subscribe', label: 'Subscriptions' },
  { value: 'achievement', label: 'Achievements' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const showToast = useToast();
  const navigate = useNavigate();

  const load = useCallback((p, cat) => {
    setLoading(true);
    fetchNotifications(p, cat || undefined).then((data) => {
      setNotifications((prev) => (p === 1 ? data.notifications : [...prev, ...data.notifications]));
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setPage(1);
    load(1, category);
  }, [category, load]);

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    load(next, category);
  }

  function handleClick(n) {
    if (!n.read) {
      const ids = n.ids || [n._id];
      setNotifications((prev) => prev.map((x) => (ids.includes(x._id) ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - ids.length));
      markNotificationsReadBulk(ids).catch(() => {});
    }
    if (n.type === 'subscribe') navigate(`/channel/${n.actor._id}`);
    else if (n.video) navigate(`/watch/${n.video._id}`);
    else if (n.type === 'achievement') navigate('/dashboard');
  }

  async function handleDelete(n) {
    const ids = n.ids || [n._id];
    setNotifications((prev) => prev.filter((x) => !ids.includes(x._id)));
    if (!n.read) setUnreadCount((c) => Math.max(0, c - ids.length));
    await deleteNotifications(ids).catch(() => {});
    showToast('Notification removed', {
      action: {
        label: 'Undo',
        onClick: async () => {
          await restoreNotifications(ids).catch(() => {});
          setPage(1);
          load(1, category);
        },
      },
    });
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead().catch(() => {});
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Notifications</h1>
        {unreadCount > 0 && (
          <button type="button" className={styles.markAllButton} onClick={handleMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>

      <div className={styles.tabs}>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            className={category === c.value ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && notifications.length === 0 ? (
        <p className={styles.hint}>Loading…</p>
      ) : notifications.length === 0 ? (
        <p className={styles.hint}>No notifications here.</p>
      ) : (
        <ul className={styles.list}>
          {notifications.map((n) => (
            <li key={n._id} className={n.read ? styles.item : `${styles.item} ${styles.itemUnread}`}>
              <button type="button" className={styles.itemMain} onClick={() => handleClick(n)}>
                <span className={styles.itemText}>{describe(n)}</span>
                <span className={styles.itemTime}>{timeAgo(n.createdAt)}</span>
              </button>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => handleDelete(n)}
                aria-label="Delete notification"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasMore && notifications.length > 0 && (
        <button
          type="button"
          className={styles.loadMoreButton}
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
