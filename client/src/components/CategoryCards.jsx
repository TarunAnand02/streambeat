import { categories } from '../features/videos/categories';
import styles from './CategoryCards.module.css';

export default function CategoryCards({ onSelect }) {
  return (
    <div className={styles.grid}>
      {categories.map((cat, index) => (
        <button
          key={cat.id}
          className={styles.card}
          style={{ backgroundColor: cat.color, animationDelay: `${Math.min(index * 20, 300)}ms` }}
          onClick={() => onSelect(cat.id)}
        >
          <span className={styles.label}>{cat.label}</span>
          <span className={styles.emoji}>{cat.emoji}</span>
        </button>
      ))}
    </div>
  );
}
