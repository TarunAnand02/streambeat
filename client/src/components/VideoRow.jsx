import VideoCard from './VideoCard';
import styles from './VideoRow.module.css';

export default function VideoRow({ title, videos }) {
  if (!videos?.length) return null;

  return (
    <section className={styles.row}>
      <h2 className={styles.heading}>{title}</h2>
      <div className={styles.scroller}>
        {videos.map((video, index) => (
          <VideoCard
            key={video._id}
            video={video}
            style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
          />
        ))}
      </div>
    </section>
  );
}
