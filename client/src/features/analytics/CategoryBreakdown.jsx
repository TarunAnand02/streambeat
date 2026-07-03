import { getCategory } from '../videos/categories';
import styles from './CategoryBreakdown.module.css';

export default function CategoryBreakdown({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.views));

  return (
    <ul className={styles.list}>
      {rows.map((row) => {
        const category = getCategory(row.category);
        return (
          <li key={row.category} className={styles.row}>
            <span className={styles.label}>
              {category?.emoji} {category?.label || row.category}
            </span>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${(row.views / max) * 100}%` }} />
            </div>
            <span className={styles.value}>{row.views}</span>
          </li>
        );
      })}
    </ul>
  );
}
