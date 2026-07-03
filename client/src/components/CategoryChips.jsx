import { categories } from '../features/videos/categories';
import styles from './CategoryChips.module.css';

export default function CategoryChips({ selected, onSelect }) {
  return (
    <nav className={styles.chipBar} aria-label="Browse by category">
      <button
        className={selected === 'all' ? `${styles.chip} ${styles.active}` : styles.chip}
        onClick={() => onSelect('all')}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={selected === cat.id ? `${styles.chip} ${styles.active}` : styles.chip}
          onClick={() => onSelect(cat.id)}
        >
          <span className={styles.emoji}>{cat.emoji}</span>
          {cat.label}
        </button>
      ))}
    </nav>
  );
}
