import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CategoryChips from '../../components/CategoryChips';
import DurationFilter, { DURATION_BUCKETS } from '../../components/DurationFilter';
import VideoCard from '../../components/VideoCard';
import VideoCardSkeleton from '../../components/VideoCardSkeleton';
import { fetchVideos, searchVideos } from './videosApi';
import styles from './SearchResultsPage.module.css';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const tag = searchParams.get('tag') || '';
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [durationBucket, setDurationBucket] = useState(null);
  const [source, setSource] = useState('all');
  const [sort, setSort] = useState('relevance');

  useEffect(() => {
    setCategory('all');
    setDurationBucket(null);
    setSource('all');
    setSort('relevance');
  }, [q, tag]);

  useEffect(() => {
    if (!q && !tag) {
      setVideos([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const bucket = DURATION_BUCKETS.find((b) => b.id === durationBucket);
    const filters = {
      category,
      minDuration: bucket?.minDuration,
      maxDuration: bucket?.maxDuration,
      source: source !== 'all' ? source : undefined,
      sort,
    };
    const request = tag
      ? fetchVideos(1, { ...filters, tags: [tag] }).then((data) => data.videos)
      : searchVideos(q, filters);
    request.then((results) => {
      if (!cancelled) {
        setVideos(results);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [q, tag, category, durationBucket, source, sort]);

  return (
    <div>
      <h1 className={styles.heading}>{tag ? `Videos tagged "${tag}"` : `Results for "${q}"`}</h1>

      <CategoryChips selected={category} onSelect={setCategory} />
      <DurationFilter selected={durationBucket} onSelect={setDurationBucket} />

      <div className={styles.filterRow}>
        <select className={styles.select} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">All sources</option>
          <option value="upload">Uploads</option>
          <option value="youtube">YouTube imports</option>
        </select>
        <select className={styles.select} value={sort} onChange={(e) => setSort(e.target.value)}>
          {!tag && <option value="relevance">Most relevant</option>}
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="most_viewed">Most viewed</option>
        </select>
      </div>

      {loading ? (
        <VideoCardSkeleton />
      ) : videos.length === 0 ? (
        <p>No videos found.</p>
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
