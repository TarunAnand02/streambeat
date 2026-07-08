import { createPortal } from 'react-dom';
import { CloseIcon, PauseIcon, PlayIcon } from './ui/Icon';
import styles from './MiniPlayerCard.module.css';

// A floating "now playing" card shown once the real player scrolls out of
// view — rather than duplicating/relocating the live <video>/iframe (risky:
// it would need to be reparented via a portal while playing, and this app's
// page-transition wrapper already showed how easily position:fixed content
// can end up anchored to the wrong ancestor), this only shows a thumbnail
// and playback controls that operate on the still-in-place real player.
// Audio keeps playing regardless of scroll position either way.
export default function MiniPlayerCard({ title, thumbnailSrc, isPlaying, onTogglePlay, onJumpBack, onClose }) {
  return createPortal(
    <div className={styles.card}>
      <button type="button" className={styles.thumbButton} onClick={onJumpBack} title="Jump back to player">
        {thumbnailSrc ? (
          <img className={styles.thumb} src={thumbnailSrc} alt="" />
        ) : (
          <div className={styles.thumbPlaceholder} />
        )}
      </button>
      <button type="button" className={styles.titleButton} onClick={onJumpBack} title="Jump back to player">
        {title}
      </button>
      <button
        type="button"
        className={styles.controlButton}
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button type="button" className={styles.controlButton} onClick={onClose} aria-label="Close mini player">
        <CloseIcon />
      </button>
    </div>,
    document.body
  );
}
