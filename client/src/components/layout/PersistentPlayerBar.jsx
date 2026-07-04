import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { setPlaying, stopPlayer, updateProgress } from '../../features/player/playerSlice';
import { streamUrl, thumbnailUrl } from '../../features/videos/videosApi';
import { formatDuration } from '../../lib/formatDuration';
import { CloseIcon, PauseIcon, PlayIcon } from '../ui/Icon';
import styles from './PersistentPlayerBar.module.css';

// Renders nothing while the user is actually on that video's own Watch page
// (its own inline <video> is the one playing there) — only steps in once
// they've navigated away, picking up from the saved position so browsing
// elsewhere doesn't just stop the video outright.
export default function PersistentPlayerBar() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { currentVideo, currentTime, isPlaying, volume } = useSelector((state) => state.player);
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [scrubTime, setScrubTime] = useState(null);

  const onMatchingWatchPage = currentVideo && location.pathname === `/watch/${currentVideo.id}`;
  const shouldRenderMiniVideo = currentVideo && !onMatchingWatchPage;

  useEffect(() => {
    if (!shouldRenderMiniVideo || !videoRef.current) return;
    videoRef.current.currentTime = currentTime;
    videoRef.current.volume = volume;
    if (isPlaying) videoRef.current.play().catch(() => {});
    // Only seed position/volume once when the mini player first takes over —
    // afterwards the video element drives its own playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRenderMiniVideo, currentVideo?.id]);

  if (!currentVideo || onMatchingWatchPage) return null;

  function togglePlay() {
    if (!videoRef.current) return;
    if (videoRef.current.paused) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }

  function handleScrub(e) {
    const value = Number(e.target.value);
    setScrubTime(value);
    if (videoRef.current) videoRef.current.currentTime = value;
  }

  const displayTime = scrubTime ?? currentTime;

  return (
    <div className={styles.bar}>
      <video
        ref={videoRef}
        className={styles.hiddenVideo}
        src={streamUrl(currentVideo.id)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          if (scrubTime === null) dispatch(updateProgress(e.currentTarget.currentTime));
        }}
        onPlay={() => dispatch(setPlaying(true))}
        onPause={() => dispatch(setPlaying(false))}
        onEnded={() => dispatch(stopPlayer())}
      />

      <Link to={`/watch/${currentVideo.id}`} className={styles.info}>
        <img className={styles.thumb} src={thumbnailUrl(currentVideo.id)} alt="" loading="lazy" />
        <div className={styles.textBlock}>
          <div className={styles.title}>{currentVideo.title}</div>
          <div className={styles.uploader}>{currentVideo.uploaderName}</div>
        </div>
      </Link>

      <button type="button" className={styles.playButton} onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <span className={styles.time}>{formatDuration(displayTime)}</span>
      <input
        type="range"
        className={styles.scrubber}
        min={0}
        max={duration || 0}
        step={0.5}
        value={displayTime}
        onChange={handleScrub}
        onMouseUp={() => setScrubTime(null)}
        onTouchEnd={() => setScrubTime(null)}
        aria-label="Seek"
      />
      <span className={styles.time}>{formatDuration(duration)}</span>

      <button
        type="button"
        className={styles.closeButton}
        onClick={() => dispatch(stopPlayer())}
        aria-label="Close player"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
