import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Chapters from '../../components/Chapters';
import Spinner from '../../components/ui/Spinner';
import { TheaterIcon, ThumbsUpIcon } from '../../components/ui/Icon';
import { useToast } from '../../components/toast/ToastProvider';
import SaveToCollectionMenu from '../collections/SaveToCollectionMenu';
import YoutubeEmbed from '../../components/YoutubeEmbed';
import { useAuth } from '../../hooks/useAuth';
import { formatViews, timeAgo } from '../../lib/formatDuration';
import { parseChapters } from '../../lib/parseChapters';
import VideoAnalyticsPanel from '../analytics/VideoAnalyticsPanel';
import CommentList from '../comments/CommentList';
import { fetchCollection } from '../collections/collectionsApi';
import { subscribe, unsubscribe } from '../channel/subscriptionsApi';
import NotesPanel from './NotesPanel';
import PlaylistPanel from './PlaylistPanel';
import VideoEditPanel from './VideoEditPanel';
import {
  captionUrl,
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
  const { user, initialized } = useAuth();
  const showToast = useToast();
  const [searchParams] = useSearchParams();
  const playlistId = searchParams.get('playlist');
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [playlist, setPlaylist] = useState(null);
  const [resolution, setResolution] = useState('auto');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [subBusy, setSubBusy] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const videoRef = useRef(null);
  const youtubeRef = useRef(null);
  const wrapperRef = useRef(null);
  const resumeTimeRef = useRef(0);

  useEffect(() => {
    setResolution('auto');
    setPlaybackRate(1);
  }, [videoId]);

  function handleResolutionChange(newRes) {
    resumeTimeRef.current = videoRef.current?.currentTime || 0;
    setResolution(newRes);
  }

  function handleSpeedChange(rate) {
    setPlaybackRate(rate);
    if (video?.source === 'youtube') {
      youtubeRef.current?.setPlaybackRate(rate);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }

  useEffect(() => {
    if (!playlistId) {
      setPlaylist(null);
      return;
    }
    let cancelled = false;
    fetchCollection(playlistId).then((data) => {
      if (!cancelled) setPlaylist(data);
    });
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  const playlistIndex = playlist ? playlist.videos.findIndex((v) => v._id === videoId) : -1;
  const nextInPlaylist = playlist && playlistIndex >= 0 ? playlist.videos[playlistIndex + 1] : null;
  const prevInPlaylist = playlist && playlistIndex > 0 ? playlist.videos[playlistIndex - 1] : null;

  const goToPlaylistVideo = useCallback(
    (targetVideo) => {
      if (!targetVideo) return;
      navigate(`/watch/${targetVideo._id}?playlist=${playlistId}`);
    },
    [navigate, playlistId]
  );

  const handleEnded = useCallback(() => {
    if (nextInPlaylist) goToPlaylistVideo(nextInPlaylist);
  }, [nextInPlaylist, goToPlaylistVideo]);

  useEffect(() => {
    // Wait for session restore first — firing before the access token is
    // back in Redux would record the view as anonymous (no watch history
    // entry) and compute like-status as logged-out even for a real session.
    if (!initialized) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetchVideo(videoId)
      .then((data) => {
        if (cancelled) return;
        setVideo(data);
        setLikesCount(data.likesCount);
        setLiked(user ? data.likes?.includes(user.id) : false);
        registerView(videoId).catch(() => {});
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, initialized]);

  // While a background transcode is running, poll for its variants to show
  // up without requiring a manual refresh — stops once it leaves 'processing'.
  useEffect(() => {
    if (video?.transcodeStatus !== 'processing') return;
    const timer = setInterval(() => {
      fetchVideo(videoId).then((data) => {
        setVideo((prev) => (prev && prev._id === data._id ? { ...prev, variants: data.variants, transcodeStatus: data.transcodeStatus } : prev));
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [video?.transcodeStatus, videoId]);

  async function handleToggleSubscribe() {
    if (!user) return navigate('/login');
    setSubBusy(true);
    try {
      if (video.isSubscribed) {
        await unsubscribe(video.uploader._id);
      } else {
        await subscribe(video.uploader._id);
      }
      setVideo((prev) => ({
        ...prev,
        isSubscribed: !prev.isSubscribed,
        subscriberCount: prev.subscriberCount + (prev.isSubscribed ? -1 : 1),
      }));
    } finally {
      setSubBusy(false);
    }
  }

  async function handleLike() {
    if (!user) return navigate('/login');
    const result = await toggleLikeVideo(videoId);
    setLiked(result.liked);
    setLikesCount(result.likesCount);
  }

  async function handleDelete() {
    if (!window.confirm('Delete this video? This cannot be undone.')) return;
    try {
      await deleteVideo(videoId);
      showToast('Video deleted', { type: 'success' });
      navigate(`/channel/${user.id}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete video', { type: 'error' });
    }
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
        case 't':
          setTheaterMode((v) => !v);
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [video, seekTo, getCurrentTime]);

  if (notFound) {
    return (
      <div className={styles.notFound}>
        <h1>Video not found</h1>
        <p>This video doesn't exist, was removed, or is private.</p>
      </div>
    );
  }

  if (loading || !video) return <Spinner />;

  const isOwner = user && video.uploader?._id === user.id;
  const chapters = parseChapters(video.description);

  return (
    <div className={theaterMode ? `${styles.page} ${styles.theaterActive}` : styles.page}>
      {video.source === 'youtube' ? (
        <div className={styles.embedWrapper} ref={wrapperRef}>
          <YoutubeEmbed
            ref={youtubeRef}
            videoId={video.youtubeVideoId}
            title={video.title}
            onEnded={handleEnded}
          />
        </div>
      ) : (
        <div className={styles.embedWrapper} ref={wrapperRef}>
          {/* key forces a fresh <video> per video id + resolution, so
              switching either never reuses a stale element */}
          <video
            key={`${video._id}-${resolution}`}
            ref={videoRef}
            className={styles.video}
            src={streamUrl(video._id, resolution === 'auto' ? undefined : resolution)}
            controls
            autoPlay
            onEnded={handleEnded}
            onLoadedMetadata={() => {
              if (resumeTimeRef.current) {
                videoRef.current.currentTime = resumeTimeRef.current;
                resumeTimeRef.current = 0;
              }
              videoRef.current.playbackRate = playbackRate;
            }}
          >
            {video.captionFilename && (
              <track kind="subtitles" src={captionUrl(video._id)} srcLang="en" label="English" default />
            )}
          </video>
        </div>
      )}

      <div className={styles.resolutionRow}>
        {video.source === 'upload' && video.variants?.length > 0 && (
          <select
            className={styles.resolutionSelect}
            value={resolution}
            onChange={(e) => handleResolutionChange(e.target.value)}
          >
            <option value="auto">Auto (Source)</option>
            {video.variants.map((v) => (
              <option key={v.resolution} value={v.resolution}>
                {v.resolution}
              </option>
            ))}
          </select>
        )}
        <select
          className={styles.resolutionSelect}
          value={playbackRate}
          onChange={(e) => handleSpeedChange(Number(e.target.value))}
          aria-label="Playback speed"
        >
          {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
            <option key={rate} value={rate}>
              {rate === 1 ? 'Normal' : `${rate}x`}
            </option>
          ))}
        </select>
        {video.source === 'upload' && video.transcodeStatus === 'processing' && (
          <span className={styles.transcodeStatus}>Processing other qualities…</span>
        )}
        <button
          type="button"
          className={theaterMode ? `${styles.theaterButton} ${styles.theaterButtonActive}` : styles.theaterButton}
          onClick={() => setTheaterMode((v) => !v)}
          title="Theater mode (t)"
          aria-label="Toggle theater mode"
        >
          <TheaterIcon />
        </button>
      </div>

      {playlist && (
        <PlaylistPanel
          playlist={playlist}
          currentVideoId={videoId}
          playlistId={playlistId}
          onPrev={() => goToPlaylistVideo(prevInPlaylist)}
          onNext={() => goToPlaylistVideo(nextInPlaylist)}
          hasPrev={Boolean(prevInPlaylist)}
          hasNext={Boolean(nextInPlaylist)}
        />
      )}

      <h1 className={styles.title}>{video.title}</h1>

      <div className={styles.meta}>
        <div className={styles.uploaderInfo}>
          <span className={styles.uploaderName}>{video.uploader?.username}</span>
          <span className={styles.stats}>
            {formatViews(video.views)} · {timeAgo(video.createdAt)}
            {typeof video.subscriberCount === 'number' &&
              ` · ${video.subscriberCount} subscriber${video.subscriberCount === 1 ? '' : 's'}`}
          </span>
        </div>
        <div className={styles.actions}>
          {!isOwner && (
            <button
              className={video.isSubscribed ? styles.subscribedButton : styles.subscribeButton}
              onClick={handleToggleSubscribe}
              disabled={subBusy}
            >
              {video.isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          )}
          <button className={liked ? styles.likedButton : styles.likeButton} onClick={handleLike}>
            <ThumbsUpIcon className={styles.likeIcon} />
            {likesCount}
          </button>
          {isOwner && <SaveToCollectionMenu video={video} onUpdated={setVideo} variant="labeled" />}
          {isOwner && (
            <button className={styles.deleteButton} onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>
      </div>

      {video.description && (
        <div className={styles.descriptionBlock}>
          <p className={descExpanded ? styles.description : `${styles.description} ${styles.descriptionClamped}`}>
            {video.description}
          </p>
          {(video.description.length > 180 || video.description.split('\n').length > 3) && (
            <button
              type="button"
              className={styles.readMoreButton}
              onClick={() => setDescExpanded((v) => !v)}
            >
              {descExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

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
