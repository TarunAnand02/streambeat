import { useState } from 'react';
import { ClockIcon } from '../../components/ui/Icon';
import { useToast } from '../../components/toast/ToastProvider';
import { addToWatchLater } from './videosApi';
import styles from './WatchLaterButton.module.css';

// A true one-click "save for later" — no picker, no popover, unlike
// SaveToCollectionMenu. $addToSet server-side makes a repeat click harmless.
export default function WatchLaterButton({ videoId }) {
  const [busy, setBusy] = useState(false);
  const showToast = useToast();

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await addToWatchLater(videoId);
      showToast('Added to Watch Later', { type: 'success' });
    } catch {
      showToast('Could not add to Watch Later', { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.trigger}
      onClick={handleClick}
      disabled={busy}
      aria-label="Add to Watch Later"
      title="Add to Watch Later"
    >
      <ClockIcon className={styles.icon} />
    </button>
  );
}
