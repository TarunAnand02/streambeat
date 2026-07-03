import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styles from './YoutubeEmbed.module.css';

let apiLoadPromise = null;
function loadYoutubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return apiLoadPromise;
}

// Per the IFrame Player API docs, these codes mean the video genuinely can't
// play here (not found/private/removed, or embedding disabled by the
// owner) — as opposed to transient errors worth just retrying.
const UNPLAYABLE_ERROR_CODES = new Set([100, 101, 150]);

const YoutubeEmbed = forwardRef(function YoutubeEmbed({ videoId, title }, ref) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => playerRef.current?.seekTo?.(seconds, true),
    getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
    play: () => playerRef.current?.playVideo?.(),
    pause: () => playerRef.current?.pauseVideo?.(),
    togglePlayPause: () => {
      const p = playerRef.current;
      if (!p) return;
      // YT.PlayerState.PLAYING === 1
      if (p.getPlayerState?.() === 1) p.pauseVideo();
      else p.playVideo();
    },
    toggleMute: () => {
      const p = playerRef.current;
      if (!p) return;
      if (p.isMuted?.()) p.unMute();
      else p.mute();
    },
  }));

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    loadYoutubeIframeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0 },
        events: {
          onError: (event) => {
            if (UNPLAYABLE_ERROR_CODES.has(event.data)) setFailed(true);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoId]);

  if (failed) {
    return (
      <div className={styles.fallback}>
        <p className={styles.fallbackText}>
          This video can't be played here — the owner has disabled embedding.
        </p>
        <a
          className={styles.fallbackLink}
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch on YouTube ↗
        </a>
      </div>
    );
  }

  return <div ref={containerRef} className={styles.player} title={title} />;
});

export default YoutubeEmbed;
