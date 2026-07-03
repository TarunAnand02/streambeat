import styles from './VideoCardSkeleton.module.css';

export default function VideoCardSkeleton({ count = 8 }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.card} style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
          <div className={styles.thumb} />
          <div className={styles.line} style={{ width: '85%' }} />
          <div className={styles.line} style={{ width: '55%' }} />
        </div>
      ))}
    </div>
  );
}
