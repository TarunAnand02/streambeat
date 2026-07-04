import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { formatDuration } from '../../lib/formatDuration';
import { categories } from './categories';
import { CheckIcon } from '../../components/ui/Icon';
import { importYoutubeBatch, previewYoutubeChannel } from './videosApi';
import uploadStyles from './UploadPage.module.css';
import styles from './ImportChannelForm.module.css';

export default function ImportChannelForm() {
  const [url, setUrl] = useState('');
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [nextPageToken, setNextPageToken] = useState(null);
  const [category, setCategory] = useState('other');
  const [fetching, setFetching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleFetch(e) {
    e.preventDefault();
    setError(null);
    setFetching(true);
    try {
      const result = await previewYoutubeChannel(url);
      setChannel(result.channel);
      setVideos(result.videos);
      setSelected(new Set());
      setNextPageToken(result.nextPageToken);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not fetch that channel');
      setChannel(null);
      setVideos([]);
    } finally {
      setFetching(false);
    }
  }

  async function handleLoadMore() {
    if (!nextPageToken) return;
    setLoadingMore(true);
    try {
      const result = await previewYoutubeChannel(url, nextPageToken);
      setVideos((prev) => [...prev, ...result.videos]);
      setNextPageToken(result.nextPageToken);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load more videos');
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleSelected(videoId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === videos.length ? new Set() : new Set(videos.map((v) => v.youtubeVideoId))
    );
  }

  async function handleImportSelected() {
    const chosen = videos.filter((v) => selected.has(v.youtubeVideoId));
    if (!chosen.length) return;
    setError(null);
    setImporting(true);
    try {
      await importYoutubeBatch(category, chosen);
      navigate(`/channel/${user.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      {error && <div className={uploadStyles.error}>{error}</div>}

      <form onSubmit={handleFetch} className={styles.fetchForm}>
        <input
          className={uploadStyles.input}
          placeholder="Paste a YouTube channel URL or @handle…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button className={styles.fetchButton} type="submit" disabled={fetching}>
          {fetching ? 'Fetching…' : 'Fetch'}
        </button>
      </form>

      {channel && (
        <>
          <div className={styles.channelHeader}>
            {channel.thumbnailUrl && (
              <img className={styles.channelAvatar} src={channel.thumbnailUrl} alt="" />
            )}
            <div className={styles.channelTitle}>{channel.title}</div>
          </div>

          <div className={styles.toolbar}>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={videos.length > 0 && selected.size === videos.length}
                onChange={toggleSelectAll}
              />
              Select all ({selected.size} of {videos.length} selected)
            </label>

            <select
              className={styles.categorySelect}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.grid}>
            {videos.map((video) => {
              const isSelected = selected.has(video.youtubeVideoId);
              return (
                <button
                  key={video.youtubeVideoId}
                  type="button"
                  className={isSelected ? `${styles.card} ${styles.selected}` : styles.card}
                  onClick={() => toggleSelected(video.youtubeVideoId)}
                >
                  <div className={styles.thumbWrapper}>
                    <img className={styles.thumb} src={video.thumbnailUrl} alt="" />
                    {video.durationSeconds ? (
                      <span className={styles.duration}>
                        {formatDuration(video.durationSeconds)}
                      </span>
                    ) : null}
                    <span className={styles.checkbox}>{isSelected ? <CheckIcon /> : ''}</span>
                  </div>
                  <div className={styles.cardTitle} title={video.title}>
                    {video.title}
                  </div>
                </button>
              );
            })}
          </div>

          {nextPageToken && (
            <button
              className={styles.loadMoreButton}
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Load more videos'}
            </button>
          )}

          <button
            className={uploadStyles.submit}
            onClick={handleImportSelected}
            disabled={importing || selected.size === 0}
          >
            {importing ? 'Importing…' : `Import ${selected.size} selected video${selected.size === 1 ? '' : 's'}`}
          </button>
        </>
      )}
    </div>
  );
}
