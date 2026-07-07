import { useEffect, useRef, useState } from 'react';
import { MoreIcon } from '../../components/ui/Icon';
import { useToast } from '../../components/toast/ToastProvider';
import { blockChannelRecommendations, markNotInterested } from './videosApi';
import styles from './RecommendationFeedbackMenu.module.css';

// Lets a viewer push back on the algorithm directly, instead of it being a
// one-way feed — shown only on the Recommended row (see VideoCard/VideoRow's
// showFeedback prop). onRemoved lets the parent row drop the video
// immediately rather than waiting for the next full refetch.
export default function RecommendationFeedbackMenu({ video, onRemoved }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef(null);
  const showToast = useToast();

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleNotInterested(e) {
    e.stopPropagation();
    setBusy(true);
    try {
      await markNotInterested(video._id);
      onRemoved?.(video._id);
      showToast("Won't recommend this video again", { type: 'success' });
    } catch {
      showToast('Could not update', { type: 'error' });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  async function handleBlockChannel(e) {
    e.stopPropagation();
    if (!video.uploader?._id) return;
    setBusy(true);
    try {
      await blockChannelRecommendations(video.uploader._id);
      onRemoved?.(video._id);
      showToast(`Won't recommend videos from ${video.uploader.username}`, { type: 'success' });
    } catch {
      showToast('Could not update', { type: 'error' });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={styles.trigger}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Recommendation feedback"
        title="Not interested?"
      >
        <MoreIcon className={styles.triggerIcon} />
      </button>
      {open && (
        <div className={styles.menu}>
          <button type="button" className={styles.menuItem} onClick={handleNotInterested} disabled={busy}>
            Not interested
          </button>
          {video.uploader?.username && (
            <button type="button" className={styles.menuItem} onClick={handleBlockChannel} disabled={busy}>
              Don't recommend {video.uploader.username}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
