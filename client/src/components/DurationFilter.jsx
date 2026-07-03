import styles from './DurationFilter.module.css';

export const DURATION_BUCKETS = [
  { id: 'under5', label: '< 5 min', minDuration: undefined, maxDuration: 299 },
  { id: '5to20', label: '5–20 min', minDuration: 300, maxDuration: 1199 },
  { id: '20to60', label: '20–60 min', minDuration: 1200, maxDuration: 3599 },
  { id: 'over60', label: '> 60 min', minDuration: 3600, maxDuration: undefined },
];

export default function DurationFilter({ selected, onSelect }) {
  return (
    <div className={styles.bar}>
      <button
        className={!selected ? `${styles.chip} ${styles.active}` : styles.chip}
        onClick={() => onSelect(null)}
      >
        Any length
      </button>
      {DURATION_BUCKETS.map((bucket) => (
        <button
          key={bucket.id}
          className={selected === bucket.id ? `${styles.chip} ${styles.active}` : styles.chip}
          onClick={() => onSelect(bucket.id)}
        >
          {bucket.label}
        </button>
      ))}
    </div>
  );
}
