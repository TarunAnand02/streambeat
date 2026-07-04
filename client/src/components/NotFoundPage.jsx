import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.code}>404</div>
      <h1 className={styles.heading}>This page doesn't exist</h1>
      <p className={styles.text}>The page you're looking for may have been moved or deleted.</p>
      <Link className={styles.homeLink} to="/">
        Go home
      </Link>
    </div>
  );
}
