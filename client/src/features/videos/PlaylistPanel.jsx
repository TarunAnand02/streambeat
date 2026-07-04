import { Link } from 'react-router-dom';
import { formatDuration } from '../../lib/formatDuration';
import { FolderIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from '../../components/ui/Icon';
import styles from './PlaylistPanel.module.css';

export default function PlaylistPanel({ playlist, currentVideoId, playlistId, onPrev, onNext, hasPrev, hasNext }) {
  if (!playlist) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.headerRow}>
        <Link className={styles.collectionName} to={`/collections/${playlistId}`}>
          <FolderIcon className={styles.inlineIcon} /> {playlist.collection.name}
        </Link>
        <div className={styles.navButtons}>
          <button type="button" className={styles.navButton} onClick={onPrev} disabled={!hasPrev}>
            <SkipBackIcon className={styles.inlineIcon} /> Prev
          </button>
          <button type="button" className={styles.navButton} onClick={onNext} disabled={!hasNext}>
            Next <SkipForwardIcon className={styles.inlineIcon} />
          </button>
        </div>
      </div>

      <ul className={styles.list}>
        {playlist.videos.map((v, index) => (
          <li key={v._id}>
            <Link
              to={`/watch/${v._id}?playlist=${playlistId}`}
              className={v._id === currentVideoId ? `${styles.item} ${styles.itemActive}` : styles.item}
            >
              <span className={styles.itemIndex}>
                {v._id === currentVideoId ? <PlayIcon className={styles.inlineIcon} /> : index + 1}
              </span>
              <span className={styles.itemTitle}>{v.title}</span>
              {v.durationSeconds && (
                <span className={styles.itemDuration}>{formatDuration(v.durationSeconds)}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
