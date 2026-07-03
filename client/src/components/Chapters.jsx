import { formatDuration } from '../lib/formatDuration';
import styles from './Chapters.module.css';

export default function Chapters({ chapters, onSeek }) {
  if (!chapters.length) return null;

  return (
    <div className={styles.chapters}>
      <h2 className={styles.heading}>Chapters</h2>
      <ul className={styles.list}>
        {chapters.map((chapter) => (
          <li key={chapter.timestampSeconds}>
            <button
              type="button"
              className={styles.chapterButton}
              onClick={() => onSeek(chapter.timestampSeconds)}
            >
              <span className={styles.chapterTime}>{formatDuration(chapter.timestampSeconds)}</span>
              <span className={styles.chapterLabel}>{chapter.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
