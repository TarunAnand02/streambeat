import { useEffect, useState } from 'react';
import { parseUserAgent } from '../../lib/parseUserAgent';
import { timeAgo } from '../../lib/formatDuration';
import { useToast } from '../../components/toast/ToastProvider';
import { fetchSessions, revokeSession } from './settingsApi';
import styles from './SettingsPage.module.css';

export default function SessionsSection() {
  const [sessions, setSessions] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const showToast = useToast();

  useEffect(() => {
    fetchSessions().then(setSessions);
  }, []);

  async function handleRevoke(id) {
    setRevokingId(id);
    try {
      await revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      showToast('Signed out of that device', { type: 'success' });
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>Sessions</h2>
      <p className={styles.hint}>Devices currently signed in to your account.</p>
      {sessions === null ? (
        <p className={styles.hint}>Loading…</p>
      ) : sessions.length === 0 ? (
        <p className={styles.hint}>No active sessions.</p>
      ) : (
        <ul className={styles.sessionList}>
          {sessions.map((s) => (
            <li key={s.id} className={styles.sessionItem}>
              <div>
                <div className={styles.sessionDevice}>
                  {parseUserAgent(s.userAgent)}
                  {s.current && <span className={styles.sessionBadge}>This device</span>}
                </div>
                <div className={styles.sessionMeta}>
                  Last active {timeAgo(s.lastUsedAt)}
                  {s.ip && ` · ${s.ip}`}
                </div>
              </div>
              {!s.current && (
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => handleRevoke(s.id)}
                  disabled={revokingId === s.id}
                >
                  {revokingId === s.id ? 'Signing out…' : 'Sign out'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
