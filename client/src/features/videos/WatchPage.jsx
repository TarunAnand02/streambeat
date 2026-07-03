import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Chapters from '../../components/Chapters';
import Spinner from '../../components/ui/Spinner';
import YoutubeEmbed from '../../components/YoutubeEmbed';
import { useAuth } from '../../hooks/useAuth';
import { formatViews, timeAgo } from '../../lib/formatDuration';
import { parseChapters } from '../../lib/parseChapters';
import VideoAnalyticsPanel from '../analytics/VideoAnalyticsPanel';
import CommentList from '../comments/CommentList';
import NotesPanel from './NotesPanel';
import VideoEditPanel from './VideoEditPanel';
import {
  deleteVideo,
  fetchVideo,
  registerView,
  streamUrl,
  toggleLikeVideo,
} from './videosApi';
import styles from './WatchPage.module.css';

export default function WatchPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const videoRef = useRef(null);
  const youtubeRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchVideo(videoId).then((data) => {
      if (cancelled) return;
      setVideo(data);
      setLikesCount(data.likesCount);
      setLiked(user ? data.likes?.includes(user.id) : false);
      registerView(videoId).catch(() => {});
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  async function handleLike() {
    if (!user) return navigate('/login');
    const result = await toggleLikeVideo(videoId);
    setLiked(result.liked);
    setLikesCount(result.likesCount);
  }

  async function handleDelete() {
    if (!window.confirm('Delete this video? This cannot be undone.')) return;
    await deleteVideo(videoId);
    navigate(`/channel/${user.id}`);
  }

  const getCurrentTime = useCallback(() => {
    if (!video) return 0;
    if (video.source === 'youtube') return youtubeRef.current?.getCurrentTime() ?? 0;
    return videoRef.current?.currentTime ?? 0;
  }, [video]);

  const seekTo = useCallback(
    (seconds) => {
      if (!video) return;
      if (video.source === 'youtube') {
        youtubeRef.current?.seekTo(seconds);
      } else if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        videoRef.current.play();
      }
    },
    [video]
  );

  // Keyboard shortcuts: ignore while typing in an input/textarea/editable
  // element so they don't hijack normal text entry (e.g. the notes box).
  useEffect(() => {
    if (!video) return;

    function isTypingTarget(el) {
      return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    }

    function handleKeyDown(e) {
      if (isTypingTarget(e.target)) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (video.source === 'youtube') {
            youtubeRef.current?.togglePlayPause?.();
          } else if (videoRef.current) {
            videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
          }
          break;
        case 'arrowleft':
        case 'j':
          seekTo(Math.max(0, getCurrentTime() - (e.key.toLowerCase() === 'j' ? 10 : 5)));
          break;
        case 'arrowright':
        case 'l':
          seekTo(getCurrentTime() + (e.key.toLowerCase() === 'l' ? 10 : 5));
          break;
        case 'm':
          if (video.source === 'youtube') {
            youtubeRef.current?.toggleMute();
          } else if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
          }
          break;
        case 'f':
          if (document.fullscreenElement) document.exitFullscreen();
          else wrapperRef.current?.requestFullscreen?.();
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [video, seekTo, getCurrentTime]);

  if (loading || !video) return <Spinner />;

  const isOwner = user && video.uploader?._id === user.id;
  const chapters = parseChapters(video.description);

  return (
    <div className={styles.page}>
      {video.source === 'youtube' ? (
        <div className={styles.embedWrapper} ref={wrapperRef}>
          <YoutubeEmbed ref={youtubeRef} videoId={video.youtubeVideoId} title={video.title} />
        </div>
      ) : (
        <div className={styles.embedWrapper} ref={wrapperRef}>
          {/* key forces a fresh <video> per video id, so switching between
              two uploads via client-side nav doesn't reuse a stale element */}
          <video
            key={video._id}
            ref={videoRef}
            className={styles.video}
            src={streamUrl(video._id)}
            controls
            autoPlay
          />
        </div>
      )}

      <h1 className={styles.title}>{video.title}</h1>

      <div className={styles.meta}>
        <div className={styles.uploaderInfo}>
          <span className={styles.uploaderName}>{video.uploader?.username}</span>
          <span className={styles.stats}>
            {formatViews(video.views)} · {timeAgo(video.createdAt)}
          </span>
        </div>
        <div className={styles.actions}>
          <button className={liked ? styles.likedButton : styles.likeButton} onClick={handleLike}>
            👍 {likesCount}
          </button>
          {isOwner && (
            <button className={styles.deleteButton} onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>
      </div>

      {video.description && <p className={styles.description}>{video.description}</p>}

      {video.tags?.length > 0 && (
        <div className={styles.tagRow}>
          {video.tags.map((tag) => (
            <span key={tag} className={styles.tagPill}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {chapters.length > 0 && <Chapters chapters={chapters} onSeek={seekTo} />}

      {isOwner && <VideoAnalyticsPanel videoId={videoId} />}

      {isOwner && <VideoEditPanel video={video} onSaved={setVideo} />}

      {user && <NotesPanel videoId={videoId} getCurrentTime={getCurrentTime} onSeek={seekTo} />}

      <CommentList videoId={videoId} />
    </div>
  );
}
