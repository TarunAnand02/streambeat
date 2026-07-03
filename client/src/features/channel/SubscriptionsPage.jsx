import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import VideoCard from '../../components/VideoCard';
import Spinner from '../../components/ui/Spinner';
import uploadStyles from '../videos/UploadPage.module.css';
import { fetchMySubscriptions, fetchSubscriptionFeed } from './subscriptionsApi';
import styles from './SubscriptionsPage.module.css';

export default function SubscriptionsPage() {
  const [channels, setChannels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMySubscriptions(), fetchSubscriptionFeed()]).then(([ch, feed]) => {
      if (!cancelled) {
        setChannels(ch);
        setVideos(feed.videos);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner />;

  if (channels.length === 0) {
    return (
      <div>
        <h1 className={uploadStyles.heading}>Subscriptions</h1>
        <p className={styles.empty}>
          You're not subscribed to any channels yet — visit a channel page and hit Subscribe.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={uploadStyles.heading}>Subscriptions</h1>

      <div className={styles.channelRow}>
        {channels.map((c) => (
          <Link key={c._id} to={`/channel/${c._id}`} className={styles.channelChip}>
            <span className={styles.channelAvatar}>{c.username.charAt(0).toUpperCase()}</span>
            {c.username}
          </Link>
        ))}
      </div>

      {videos.length === 0 ? (
        <p className={styles.empty}>No videos from your subscriptions yet.</p>
      ) : (
        <div className={styles.grid}>
          {videos.map((video, index) => (
            <VideoCard
              key={video._id}
              video={video}
              style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
