import { useEffect, useState } from 'react';
import { useToast } from '../../components/toast/ToastProvider';
import { CloseIcon, ShareIcon } from '../../components/ui/Icon';
import { createShareLink, fetchShareLinks, revokeShareLink } from './shareLinksApi';
import styles from './ShareLinksPanel.module.css';

export default function ShareLinksPanel({ videoId }) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState(null);
  const [password, setPassword] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [creating, setCreating] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    if (open && links === null) {
      fetchShareLinks(videoId).then(setLinks);
    }
  }, [open, links, videoId]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await createShareLink(videoId, {
        password: password.trim() || undefined,
        expiresInHours: expiresInHours ? Number(expiresInHours) : undefined,
      });
      setPassword('');
      setLinks(await fetchShareLinks(videoId));
      showToast('Share link created', { type: 'success' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not create share link', { type: 'error' });
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id) {
    await revokeShareLink(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function handleCopy(token) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied', { type: 'success' });
  }

  if (!open) {
    return (
      <button type="button" className={styles.toggleButton} onClick={() => setOpen(true)}>
        <ShareIcon className={styles.inlineIcon} /> Share link
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Share links</span>
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => setOpen(false)}
          aria-label="Close share links"
        >
          <CloseIcon />
        </button>
      </div>

      <p className={styles.hint}>
        Anyone with a share link can watch this video, even if it's private — a password adds an
        extra check.
      </p>

      <form className={styles.form} onSubmit={handleCreate}>
        <input
          type="password"
          className={styles.input}
          placeholder="Optional password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select
          className={styles.input}
          value={expiresInHours}
          onChange={(e) => setExpiresInHours(e.target.value)}
        >
          <option value="24">Expires in 24 hours</option>
          <option value="168">Expires in 7 days</option>
          <option value="720">Expires in 30 days</option>
          <option value="">Never expires</option>
        </select>
        <button type="submit" className={styles.createButton} disabled={creating}>
          {creating ? 'Creating…' : 'Create link'}
        </button>
      </form>

      {links === null ? (
        <p className={styles.hint}>Loading…</p>
      ) : links.length === 0 ? (
        <p className={styles.hint}>No share links yet.</p>
      ) : (
        <ul className={styles.list}>
          {links.map((link) => (
            <li key={link.id} className={styles.item}>
              <div className={styles.itemInfo}>
                <span className={styles.itemToken}>/share/{link.token.slice(0, 10)}…</span>
                <span className={styles.itemMeta}>
                  {link.hasPassword ? 'Password-protected' : 'No password'}
                  {link.expiresAt
                    ? ` · Expires ${new Date(link.expiresAt).toLocaleDateString()}`
                    : ' · Never expires'}
                  {link.expired && ' · Expired'}
                </span>
              </div>
              <div className={styles.itemActions}>
                <button type="button" className={styles.smallButton} onClick={() => handleCopy(link.token)}>
                  Copy
                </button>
                <button
                  type="button"
                  className={styles.smallButtonDanger}
                  onClick={() => handleRevoke(link.id)}
                >
                  Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
