import { useNavigate } from 'react-router-dom';
import { CheckIcon, FilmIcon, PlayIcon } from './ui/Icon';
import { useHoverPreview } from '../hooks/useHoverPreview';
import { formatDuration, formatViews, timeAgo } from '../lib/formatDuration';
import { getCategory } from '../features/videos/categories';
import { streamUrl, thumbnailUrl } from '../features/videos/videosApi';
import styles from './VideoCard.module.css';

export default function VideoCard({ video, style, selectable, selected, onToggleSelect, playlistId }) {
  const navigate = useNavigate();
  const { previewing, onMouseEnter, onMouseLeave } = useHoverPreview();
  const category = getCategory(video.category);
  const isYoutube = video.source === 'youtube';
  const watchPath = playlistId ? `/watch/${video._id}?playlist=${playlistId}` : `/watch/${video._id}`;

  function handlePlay(e) {
    e.stopPropagation();
    navigate(watchPath);
  }

  function handleCardClick() {
    if (selectable) onToggleSelect(video._id);
    else navigate(watchPath);
  }

  return (
    <div
      className={selectable && selected ? `${styles.card} ${styles.selected}` : styles.card}
      style={style}
      onMouseEnter={isYoutube || selectable ? undefined : onMouseEnter}
      onMouseLeave={isYoutube || selectable ? undefined : onMouseLeave}
      onClick={handleCardClick}
    >
      <div className={styles.thumbWrapper}>
        {isYoutube ? (
          video.youtubeThumbnailUrl ? (
            <img
              className={styles.thumbMedia}
              src={video.youtubeThumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className={styles.thumbPlaceholder}>
              <FilmIcon />
            </div>
          )
        ) : previewing && !selectable ? (
          <video
            className={styles.thumbMedia}
            src={streamUrl(video._id)}
            muted
            autoPlay
            loop
            preload="metadata"
          />
        ) : video.thumbnailFilename ? (
          <img
            className={styles.thumbMedia}
            src={thumbnailUrl(video._id)}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className={styles.thumbPlaceholder}>
            <FilmIcon />
          </div>
        )}
        {video.durationSeconds ? (
          <span className={styles.durationBadge}>{formatDuration(video.durationSeconds)}</span>
        ) : null}
        {selectable ? (
          <span className={styles.checkbox}>{selected ? <CheckIcon /> : ''}</span>
        ) : (
          <button className={styles.playOverlay} onClick={handlePlay} title="Play" aria-label="Play video">
            <PlayIcon />
          </button>
        )}
      </div>
      <div className={styles.meta}>
        <div className={styles.title} title={video.title}>
          {video.title}
        </div>
        {video.uploader?.username && (
          <div className={styles.uploader}>{video.uploader.username}</div>
        )}
        <div className={styles.stats}>
          {formatViews(video.views)} · {timeAgo(video.createdAt)}
        </div>
        {category && (
          <div className={styles.category} style={{ color: category.color }}>
            {category.emoji} {category.label}
          </div>
        )}
      </div>
    </div>
  );
}
