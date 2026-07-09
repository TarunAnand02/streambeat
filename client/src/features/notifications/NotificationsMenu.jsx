import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon } from '../../components/ui/Icon';
import { timeAgo } from '../../lib/formatDuration';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationsReadBulk,
} from './notificationsApi';
import styles from './NotificationsMenu.module.css';

const POLL_MS = 30000;

function othersSuffix(count) {
  const others = count - 1;
  return others > 0 ? ` and ${others} other${others === 1 ? '' : 's'}` : '';
}

export function describe(n) {
  const groupCount = n.groupCount || 1;
  switch (n.type) {
    case 'subscribe':
      return (
        <>
          <strong>
            {n.actor?.username}
            {othersSuffix(groupCount)}
          </strong>{' '}
          subscribed to your channel
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
          <strong>
            {n.actor?.username}
            {othersSuffix(groupCount)}
          </strong>{' '}
          liked <strong>{n.video?.title}</strong>
        </>
      );
    case 'reply':
      return (
        <>
          <strong>{n.actor?.username}</strong> replied to your comment on{' '}
          <strong>{n.video?.title}</strong>
        </>
      );
    case 'achievement':
      return (
        <>
          🏆 Achievement unlocked: <strong>{n.meta}</strong>
        </>
      );
    case 'transcode_complete':
      return (
        <>
          <strong>{n.video?.title}</strong> finished processing — more quality options are ready
        </>
      );
    case 'collection_add':
      return (
        <>
          <strong>{n.actor?.username}</strong> added <strong>{n.video?.title}</strong> to{' '}
          <strong>{n.meta}</strong>
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
      const ids = new Set(n.ids || [n._id]);
      setNotifications((prev) => prev.map((x) => (ids.has(x._id) ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationsReadBulk(n.ids || [n._id]).catch(() => {});
    }
    setOpen(false);
    if (n.type === 'subscribe') {
      navigate(`/channel/${n.actor._id}`);
    } else if (n.video) {
      navigate(`/watch/${n.video._id}`);
    } else if (n.type === 'achievement') {
      navigate('/dashboard');
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
          <button
            type="button"
            className={styles.seeAllButton}
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
          >
            See all notifications
          </button>
        </div>
      )}
    </div>
  );
}
