import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon } from '../../components/ui/Icon';
import { timeAgo } from '../../lib/formatDuration';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notificationsApi';
import styles from './NotificationsMenu.module.css';

const POLL_MS = 30000;

function describe(n) {
  switch (n.type) {
    case 'subscribe':
      return (
        <>
          <strong>{n.actor?.username}</strong> subscribed to your channel
        </>
      );
    case 'comment':
      return (
        <>
          <strong>{n.actor?.username}</strong> commented on <strong>{n.video?.title}</strong>
        </>
      );
    case 'like':
      return (
        <>
          <strong>{n.actor?.username}</strong> liked <strong>{n.video?.title}</strong>
        </>
      );
    default:
      return 'New notification';
  }
}

export default function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  async function refresh() {
    const data = await fetchNotifications();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleToggle() {
    setOpen((v) => !v);
  }

  async function handleItemClick(n) {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(n._id).catch(() => {});
    }
    setOpen(false);
    if (n.type === 'subscribe') {
      navigate(`/channel/${n.actor._id}`);
    } else if (n.video) {
      navigate(`/watch/${n.video._id}`);
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead().catch(() => {});
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.bellButton}
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <BellIcon />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className={styles.menu}>
          <div className={styles.menuHeader}>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className={styles.markAllButton} onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          {!loaded ? (
            <p className={styles.hint}>Loading…</p>
          ) : notifications.length === 0 ? (
            <p className={styles.hint}>No notifications yet.</p>
          ) : (
            <ul className={styles.list}>
              {notifications.map((n) => (
                <li key={n._id}>
                  <button
                    type="button"
                    className={n.read ? styles.item : `${styles.item} ${styles.itemUnread}`}
                    onClick={() => handleItemClick(n)}
                  >
                    <span className={styles.itemText}>{describe(n)}</span>
                    <span className={styles.itemTime}>{timeAgo(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
