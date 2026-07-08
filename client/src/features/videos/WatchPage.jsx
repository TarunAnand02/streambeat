import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Chapters from '../../components/Chapters';
import FocusTimer from '../../components/FocusTimer';
import KeyboardShortcutsModal from '../../components/KeyboardShortcutsModal';
import MiniPlayerCard from '../../components/MiniPlayerCard';
import TranscriptPanel from '../../components/TranscriptPanel';
import Spinner from '../../components/ui/Spinner';
import Avatar from '../../components/ui/Avatar';
import {
  AudioIcon,
  CaptionsIcon,
  FlagIcon,
  HelpIcon,
  PipIcon,
  ShareIcon,
  SkipBackIcon,
  SkipForwardIcon,
  TheaterIcon,
  ThumbsUpIcon,
} from '../../components/ui/Icon';
import ReportModal from '../reports/ReportModal';
import { useToast } from '../../components/toast/ToastProvider';
import SaveToCollectionMenu from '../collections/SaveToCollectionMenu';
import YoutubeEmbed from '../../components/YoutubeEmbed';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { formatViews, timeAgo } from '../../lib/formatDuration';
import { parseChapters } from '../../lib/parseChapters';
import VideoAnalyticsPanel from '../analytics/VideoAnalyticsPanel';
import CommentList from '../comments/CommentList';
import { fetchCollection } from '../collections/collectionsApi';
import { subscribe, unsubscribe } from '../channel/subscriptionsApi';
import NotesPanel from './NotesPanel';
import PlaylistPanel from './PlaylistPanel';
import ShareLinksPanel from '../share/ShareLinksPanel';
import VideoEditPanel from './VideoEditPanel';
import {
  captionUrl,
  deleteVideo,
  fetchVideo,
  registerView,
  streamUrl,
  thumbnailUrl,
  toggleLikeVideo,
  updateWatchProgress,
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
  const studyMode = Boolean(user?.studyModeEnabled);
  const [showCommentsInStudyMode, setShowCommentsInStudyMode] = useState(false);
  const [sleepSelection, setSleepSelection] = useState('off');
  const [sleepEndsAt, setSleepEndsAt] = useState(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [miniPlayerDismissed, setMiniPlayerDismissed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef(null);
  const youtubeRef = useRef(null);
  const wrapperRef = useRef(null);
  const resumeTimeRef = useRef(0);
  // Mirrors of the corresponding state, read by the periodic progress
  // report below — kept as refs so that effect doesn't need to tear down
  // and rebuild its interval every time the user changes speed/resolution.
  const resolutionRef = useRef(resolution);
  const playbackRateRef = useRef(playbackRate);
  const captionsOnRef = useRef(captionsOn);

  useEffect(() => {
    resolutionRef.current = resolution;
  }, [resolution]);
  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);
  useEffect(() => {
    captionsOnRef.current = captionsOn;
  }, [captionsOn]);

  useEffect(() => {
    // Reset to defaults immediately so switching videos never briefly shows
    // the previous video's settings; fetchVideo's playbackPrefs (if any)
    // then overrides these once it resolves, below.
    setResolution('auto');
    setPlaybackRate(1);
    setCaptionsOn(false);
  }, [videoId]);

  // The <track> element's `default` attribute only sets INITIAL state — a
  // toggle button needs to flip the TextTrack's mode directly to actually
  // show/hide captions after the video has already loaded.
  useEffect(() => {
    const track = videoRef.current?.textTracks?.[0];
    if (!track) return;
    track.mode = captionsOn ? 'showing' : 'hidden';
  }, [captionsOn, resolution, video?._id]);

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
        // Consumed by the native <video>'s onLoadedMetadata below; for a
        // YouTube-sourced video, YoutubeEmbed's onReady callback seeks
        // instead (the iframe player isn't ready this early).
        if (data.resumeAt) resumeTimeRef.current = data.resumeAt;
        if (data.playbackPrefs) {
          setResolution(data.playbackPrefs.resolution || 'auto');
          setPlaybackRate(data.playbackPrefs.playbackRate || 1);
          setCaptionsOn(data.playbackPrefs.captionsOn);
        } else {
          // No saved preference yet — match the historical default of
          // captions on whenever the video actually has a caption file.
          setCaptionsOn(Boolean(data.captionFilename));
        }
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

  // Powers "resume where you left off" and the Home page's Continue
  // Watching row — only logged-in viewers have anywhere to save this.
  // Reported periodically rather than on every timeupdate tick (which fires
  // several times a second) to avoid hammering the API.
  useEffect(() => {
    if (!user || !video) return;

    function report() {
      const position = getCurrentTime();
      if (position < 3) return; // not worth persisting "basically zero"
      updateWatchProgress(video._id, position, video.durationSeconds || undefined, {
        playbackRate: playbackRateRef.current,
        resolution: resolutionRef.current,
        captionsOn: captionsOnRef.current,
      }).catch(() => {});
    }

    const timer = setInterval(report, 10000);
    window.addEventListener('beforeunload', report);
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', report);
      report();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, video?._id]);

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

  async function handlePictureInPicture() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      showToast('Picture-in-picture is not available for this video', { type: 'error' });
    }
  }

  function handleSleepChange(e) {
    const val = e.target.value;
    setSleepSelection(val);
    setSleepEndsAt(val === 'off' ? null : Date.now() + Number(val) * 60 * 1000);
  }

  useEffect(() => {
    if (!sleepEndsAt) return;
    const timeout = setTimeout(() => {
      if (video?.source === 'youtube') youtubeRef.current?.pause();
      else videoRef.current?.pause();
      setSleepEndsAt(null);
      setSleepSelection('off');
      showToast('Sleep timer ended — playback paused', { type: 'success' });
    }, Math.max(sleepEndsAt - Date.now(), 0));
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepEndsAt]);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard', { type: 'success' });
    } catch {
      showToast('Could not copy link', { type: 'error' });
    }
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

  const getDuration = useCallback(() => {
    if (!video) return 0;
    if (video.source === 'youtube') return youtubeRef.current?.getDuration() ?? 0;
    return videoRef.current?.duration || 0;
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

  // Tracks real play/pause state via DOM events (native) or polling
  // (YouTube, whose IFrame API only exposes a getter) — needed so the mini
  // player's icon stays correct even when playback is toggled by the
  // native browser controls rather than our own buttons/shortcuts.
  useEffect(() => {
    if (!video || video.source === 'youtube') return;
    const el = videoRef.current;
    if (!el) return;
    function onPlay() {
      setIsPlaying(true);
    }
    function onPause() {
      setIsPlaying(false);
    }
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    setIsPlaying(!el.paused);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [video, resolution]);

  useEffect(() => {
    if (!video || video.source !== 'youtube' || !showMiniPlayer) return;
    const timer = setInterval(() => {
      const state = youtubeRef.current?.getPlayerState?.();
      if (state !== undefined) setIsPlaying(state === 1); // YT.PlayerState.PLAYING
    }, 1000);
    return () => clearInterval(timer);
  }, [video, showMiniPlayer]);

  // Shows a small floating mini player once the real player has scrolled
  // out of view (e.g. reading comments/notes further down the page) —
  // playback itself is untouched, this just surfaces quick controls.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowMiniPlayer(!entry.isIntersecting);
        if (entry.isIntersecting) setMiniPlayerDismissed(false);
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [video?._id]);

  function handleMiniPlayerTogglePlay() {
    if (video.source === 'youtube') {
      youtubeRef.current?.togglePlayPause?.();
    } else if (videoRef.current) {
      videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
    }
  }

  function handleMiniPlayerJumpBack() {
    wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

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
        case 'arrowup':
          e.preventDefault();
          if (video.source === 'youtube') {
            youtubeRef.current?.setVolume(Math.min(1, (youtubeRef.current?.getVolume() ?? 1) + 0.05));
          } else if (videoRef.current) {
            videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.05);
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          if (video.source === 'youtube') {
            youtubeRef.current?.setVolume(Math.max(0, (youtubeRef.current?.getVolume() ?? 1) - 0.05));
          } else if (videoRef.current) {
            videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.05);
          }
          break;
        case 'c':
          if (video.source === 'upload' && video.captionFilename) {
            setCaptionsOn((v) => !v);
          }
          break;
        case 'home':
          e.preventDefault();
          seekTo(0);
          break;
        case 'end':
          e.preventDefault();
          seekTo(Math.max(0, getDuration() - 1));
          break;
        case '?':
          setShowShortcuts((v) => !v);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          const duration = getDuration();
          if (duration > 0) seekTo((duration * Number(e.key)) / 10);
          break;
        }
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [video, seekTo, getCurrentTime, getDuration]);

  useDocumentMeta(video?.title, video?.description?.slice(0, 160));

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

  const pageClassName = [styles.page, theaterMode && styles.theaterActive, playlist && styles.pageWithPlaylist]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={pageClassName}>
      <div className={playlist ? `${styles.layout} ${styles.layoutWithPlaylist}` : styles.layout}>
      <div className={styles.mainColumn}>
      {video.source === 'youtube' ? (
        <div className={styles.embedWrapper} ref={wrapperRef}>
          <YoutubeEmbed
            ref={youtubeRef}
            videoId={video.youtubeVideoId}
            title={video.title}
            onEnded={handleEnded}
            onReady={() => {
              if (resumeTimeRef.current) {
                youtubeRef.current?.seekTo(resumeTimeRef.current);
                resumeTimeRef.current = 0;
              }
            }}
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
              <track kind="subtitles" src={captionUrl(video._id)} srcLang="en" label="English" />
            )}
          </video>
          {audioOnly && (
            // Covers the video frame without pausing/hiding the underlying
            // element — audio keeps playing exactly as before, only the
            // picture is obscured.
            <div className={styles.audioOnlyOverlay}>
              {video.thumbnailFilename && (
                <img className={styles.audioOnlyThumb} src={thumbnailUrl(video._id)} alt="" />
              )}
              <AudioIcon className={styles.audioOnlyIcon} />
              <div className={styles.audioOnlyTitle}>{video.title}</div>
            </div>
          )}
        </div>
      )}

      <div className={styles.resolutionRow}>
        <button
          type="button"
          className={styles.theaterButton}
          onClick={() => seekTo(Math.max(0, getCurrentTime() - 5))}
          title="Rewind 5 seconds (←)"
          aria-label="Rewind 5 seconds"
        >
          <SkipBackIcon />
        </button>
        <button
          type="button"
          className={styles.theaterButton}
          onClick={() => seekTo(getCurrentTime() + 5)}
          title="Forward 5 seconds (→)"
          aria-label="Forward 5 seconds"
        >
          <SkipForwardIcon />
        </button>
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
        <select
          className={
            sleepSelection !== 'off'
              ? `${styles.resolutionSelect} ${styles.sleepTimerActive}`
              : styles.resolutionSelect
          }
          value={sleepSelection}
          onChange={handleSleepChange}
          aria-label="Sleep timer"
          title="Pause playback automatically after a set time"
        >
          <option value="off">Sleep timer: Off</option>
          <option value="10">Sleep in 10 min</option>
          <option value="20">Sleep in 20 min</option>
          <option value="30">Sleep in 30 min</option>
          <option value="60">Sleep in 60 min</option>
        </select>
        {video.source === 'upload' && (
          <button
            type="button"
            className={styles.theaterButton}
            onClick={handlePictureInPicture}
            title="Picture-in-picture"
            aria-label="Toggle picture-in-picture"
          >
            <PipIcon />
          </button>
        )}
        {video.source === 'upload' && (
          <button
            type="button"
            className={audioOnly ? `${styles.theaterButton} ${styles.theaterButtonActive}` : styles.theaterButton}
            onClick={() => setAudioOnly((v) => !v)}
            title="Audio-only mode"
            aria-label="Toggle audio-only mode"
          >
            <AudioIcon />
          </button>
        )}
        {video.source === 'upload' && video.captionFilename && (
          <button
            type="button"
            className={captionsOn ? `${styles.theaterButton} ${styles.theaterButtonActive}` : styles.theaterButton}
            onClick={() => setCaptionsOn((v) => !v)}
            title="Toggle captions"
            aria-label="Toggle captions"
          >
            <CaptionsIcon />
          </button>
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
        <button
          type="button"
          className={styles.theaterButton}
          onClick={() => setShowShortcuts(true)}
          title="Keyboard shortcuts (?)"
          aria-label="Show keyboard shortcuts"
        >
          <HelpIcon />
        </button>
      </div>

      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}

      <h1 className={styles.title}>{video.title}</h1>

      <div className={styles.channelRow}>
        {video.uploader && (
          <Link to={`/channel/${video.uploader._id}`} className={styles.channelInfo}>
            <Avatar username={video.uploader.username} avatarUrl={video.uploader.avatarUrl} size={40} />
            <div className={styles.channelText}>
              <span className={styles.uploaderName}>{video.uploader.username}</span>
              {typeof video.subscriberCount === 'number' && (
                <span className={styles.subscriberCount}>
                  {video.subscriberCount} subscriber{video.subscriberCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </Link>
        )}
        {!isOwner && (
          <button
            className={video.isSubscribed ? styles.subscribedButton : styles.subscribeButton}
            onClick={handleToggleSubscribe}
            disabled={subBusy}
          >
            {video.isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        )}
      </div>

      <div className={styles.actions}>
        <button className={liked ? styles.likedButton : styles.likeButton} onClick={handleLike}>
          <ThumbsUpIcon className={styles.likeIcon} />
          {likesCount}
        </button>
        <button className={styles.pillButton} onClick={handleShare}>
          <ShareIcon className={styles.likeIcon} />
          Share
        </button>
        {isOwner && <SaveToCollectionMenu video={video} onUpdated={setVideo} variant="labeled" />}
        {isOwner && (
          <button className={styles.deleteButton} onClick={handleDelete}>
            Delete
          </button>
        )}
        {!isOwner && user && (
          <button className={styles.pillButton} onClick={() => setReportOpen(true)}>
            <FlagIcon className={styles.likeIcon} />
            Report
          </button>
        )}
      </div>

      {reportOpen && (
        <ReportModal targetType="video" targetId={video._id} onClose={() => setReportOpen(false)} />
      )}

      <div className={styles.descriptionBlock}>
        <div className={styles.descriptionMeta}>
          {formatViews(video.views)} · {timeAgo(video.createdAt)}
        </div>
        {video.description && (
          <>
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
          </>
        )}
      </div>

      {video.tags?.length > 0 && (
        <div className={styles.tagRow}>
          {video.tags.map((tag) => (
            <span key={tag} className={styles.tagPill}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {studyMode && <FocusTimer videoId={videoId} playerRef={wrapperRef} />}

      {showMiniPlayer && !miniPlayerDismissed && (
        <MiniPlayerCard
          title={video.title}
          thumbnailSrc={
            video.source === 'youtube'
              ? video.youtubeThumbnailUrl
              : video.thumbnailFilename
                ? thumbnailUrl(video._id)
                : null
          }
          isPlaying={isPlaying}
          onTogglePlay={handleMiniPlayerTogglePlay}
          onJumpBack={handleMiniPlayerJumpBack}
          onClose={() => setMiniPlayerDismissed(true)}
        />
      )}

      {chapters.length > 0 && <Chapters chapters={chapters} onSeek={seekTo} />}

      {video.captionFilename && <TranscriptPanel videoId={videoId} onSeek={seekTo} />}

      {isOwner && <VideoAnalyticsPanel videoId={videoId} />}

      {isOwner && <ShareLinksPanel videoId={videoId} />}

      {isOwner && <VideoEditPanel video={video} onSaved={setVideo} />}

      {user && <NotesPanel videoId={videoId} getCurrentTime={getCurrentTime} onSeek={seekTo} />}

      {studyMode && !showCommentsInStudyMode ? (
        <button
          type="button"
          className={styles.readMoreButton}
          onClick={() => setShowCommentsInStudyMode(true)}
        >
          Show comments
        </button>
      ) : (
        <CommentList videoId={videoId} />
      )}
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
      </div>
    </div>
  );
}
