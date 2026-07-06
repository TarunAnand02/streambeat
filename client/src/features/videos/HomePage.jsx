import { useEffect, useState } from 'react';
import CategoryCards from '../../components/CategoryCards';
import CategoryChips from '../../components/CategoryChips';
import DurationFilter, { DURATION_BUCKETS } from '../../components/DurationFilter';
import VideoCardSkeleton from '../../components/VideoCardSkeleton';
import VideoRow from '../../components/VideoRow';
import { getCategory } from './categories';
import { fetchRecommended, fetchTrending, fetchVideos } from './videosApi';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [durationBucket, setDurationBucket] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    fetchRecommended()
      .then(setRecommended)
      .catch(() => {});
    fetchTrending()
      .then(setTrending)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const bucket = DURATION_BUCKETS.find((b) => b.id === durationBucket);
    fetchVideos(1, {
      category,
      minDuration: bucket?.minDuration,
      maxDuration: bucket?.maxDuration,
    })
      .then((data) => {
        if (!cancelled) setVideos(data.videos);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, durationBucket]);

  const mostViewed = [...videos].sort((a, b) => b.views - a.views);

  return (
    <div>
      <CategoryChips selected={category} onSelect={setCategory} />
      <DurationFilter selected={durationBucket} onSelect={setDurationBucket} />

      {loading ? (
        <VideoCardSkeleton />
      ) : videos.length === 0 ? (
        <div>
          <p className={styles.emptyMessage}>
            {category === 'all' && !durationBucket
              ? 'No videos yet — be the first to upload one!'
              : 'No videos match these filters.'}
          </p>
          {category === 'all' && !durationBucket && (
            <>
              <h2 className={styles.browseHeading}>Browse by category</h2>
              <CategoryCards onSelect={setCategory} />
            </>
          )}
        </div>
      ) : (
        <div>
          {category === 'all' && !durationBucket && trending.length > 0 && (
            <VideoRow title="Trending" videos={trending} />
          )}
          {category === 'all' && !durationBucket && recommended.length > 0 && (
            <VideoRow title="Recommended for you" videos={recommended} />
          )}
          <VideoRow
            title={category === 'all' ? 'Recently uploaded' : `Recently uploaded in ${getCategory(category)?.label}`}
            videos={videos}
          />
          <VideoRow title="Most viewed" videos={mostViewed} />
        </div>
      )}
    </div>
  );
}
