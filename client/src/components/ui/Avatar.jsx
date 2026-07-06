import styles from './Avatar.module.css';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// avatarUrl is a path relative to the API (e.g. "/users/<id>/avatar"), not a
// full URL — same reasoning as videosApi.js's thumbnailUrl/streamUrl: the
// server never bakes its own origin into stored data (that broke email links
// once already when CLIENT_ORIGIN was misconfigured).
export default function Avatar({ username, avatarUrl, size = 36, className = '' }) {
  const initial = username?.charAt(0).toUpperCase() || '?';
  return (
    <div
      className={`${styles.avatar} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {avatarUrl ? (
        <img className={styles.image} src={`${baseURL}${avatarUrl}`} alt="" />
      ) : (
        initial
      )}
    </div>
  );
}
