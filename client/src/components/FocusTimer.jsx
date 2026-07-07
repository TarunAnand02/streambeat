import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, CloseIcon, FlameIcon, TargetIcon, TimerIcon } from './ui/Icon';
import { useToast } from './toast/ToastProvider';
import { fetchFocusStats, postFocusSession } from '../features/focus/focusApi';
import styles from './FocusTimer.module.css';

const FOCUS_PRESETS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '15 min', seconds: 15 * 60 },
  { label: '5 min', seconds: 5 * 60 },
];
const BREAK_SECONDS = 5 * 60;
const EYE_REST_INTERVAL_SECONDS = 20 * 60;
const MIN_LOGGABLE_MINUTES = 1;

const POSITION_STORAGE_KEY = 'focusTimerPosition';
const DRAG_THRESHOLD_PX = 4;
const OVERLAP_CHECK_INTERVAL_MS = 400;
const OVERLAP_HIDE_DELAY_MS = 2000;

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function loadSavedPosition() {
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function clampToViewport(x, y, width, height) {
  const maxX = Math.max(4, window.innerWidth - width - 4);
  const maxY = Math.max(4, window.innerHeight - height - 4);
  return { x: Math.min(Math.max(4, x), maxX), y: Math.min(Math.max(4, y), maxY) };
}

// A Pomodoro-style focus HUD shown only in Study Mode. Tracks real elapsed
// focus time (not just wall-clock session length) so pausing doesn't inflate
// the minutes eventually logged to the server for streaks/recap.
export default function FocusTimer({ videoId, playerRef }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [phase, setPhase] = useState('focus');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_PRESETS[0].seconds);
  const [running, setRunning] = useState(false);
  const [goal, setGoal] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [stats, setStats] = useState(null);
  const [recap, setRecap] = useState(null);
  const [position, setPosition] = useState(loadSavedPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);
  const showToast = useToast();

  const rootRef = useRef(null);
  const intervalRef = useRef(null);
  const elapsedFocusSecondsRef = useRef(0);
  const goalRef = useRef('');
  const submittedRef = useRef(false);
  const dragStateRef = useRef(null);
  const justDraggedRef = useRef(false);
  const overlapStartRef = useRef(null);

  useEffect(() => {
    goalRef.current = goal;
  }, [goal]);

  useEffect(() => {
    fetchFocusStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  async function submitSession() {
    const minutes = Math.round(elapsedFocusSecondsRef.current / 60);
    elapsedFocusSecondsRef.current = 0;
    if (minutes < MIN_LOGGABLE_MINUTES || submittedRef.current) return;
    submittedRef.current = true;
    try {
      const { stats: newStats } = await postFocusSession({
        goal: goalRef.current,
        videoId,
        minutes,
      });
      setStats((prev) => ({ ...prev, ...newStats }));
      setRecap({ minutes, goal: goalRef.current, streak: newStats.currentStreak });
    } catch {
      // best-effort — losing a recap card isn't worth surfacing an error for
    } finally {
      submittedRef.current = false;
    }
  }

  // Submits any real progress (>=1 min) if the user navigates away mid-session
  // rather than clicking "End session" — fire-and-forget since the component
  // is unmounting and can't show a recap anyway.
  useEffect(() => {
    return () => {
      if (elapsedFocusSecondsRef.current >= 60 && !submittedRef.current) {
        submittedRef.current = true;
        postFocusSession({
          goal: goalRef.current,
          videoId,
          minutes: Math.round(elapsedFocusSecondsRef.current / 60),
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      if (phase === 'focus') {
        elapsedFocusSecondsRef.current += 1;
        if (elapsedFocusSecondsRef.current % EYE_REST_INTERVAL_SECONDS === 0) {
          showToast('👀 Eye-rest break: look at something 20 feet away for 20 seconds', {
            type: 'success',
          });
        }
      }
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          if (phase === 'focus') {
            showToast('Focus block complete — take a short break?', { type: 'success' });
            setPhase('break');
            return BREAK_SECONDS;
          }
          showToast("Break's over — ready for another round?", { type: 'success' });
          setPhase('focus');
          return FOCUS_PRESETS[0].seconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  // Drag-to-reposition — a pointerdown on any non-excluded part of the
  // widget starts tracking; it only actually becomes a drag (and suppresses
  // the underlying click, e.g. the pill's expand action) once the pointer
  // has moved past a small threshold, so a plain click/tap still works.
  // These three are wrapped in useCallback with no deps (they only ever
  // touch refs and stable setState functions) so the exact same function
  // reference is used for both addEventListener and removeEventListener —
  // otherwise a stale closure from an earlier render would fail to detach.
  const handleDragMove = useCallback((e) => {
    const ds = dragStateRef.current;
    if (!ds) return;
    const dx = e.clientX - ds.startClientX;
    const dy = e.clientY - ds.startClientY;
    if (!ds.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    ds.moved = true;
    setIsDragging(true);

    const el = rootRef.current;
    setPosition(
      clampToViewport(
        e.clientX - ds.offsetX,
        e.clientY - ds.offsetY,
        el?.offsetWidth || 0,
        el?.offsetHeight || 0
      )
    );
  }, []);

  const handleDragEnd = useCallback(() => {
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', handleDragEnd);
    const ds = dragStateRef.current;
    if (ds?.moved) {
      justDraggedRef.current = true;
      setIsDragging(false);
      setPosition((pos) => {
        if (pos) {
          try {
            localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(pos));
          } catch {
            // best-effort — losing the saved position just means it resets next visit
          }
        }
        return pos;
      });
    }
    dragStateRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragStart = useCallback(
    (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest('[data-no-drag]')) return;
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      dragStateRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        moved: false,
      };
      window.addEventListener('pointermove', handleDragMove);
      window.addEventListener('pointerup', handleDragEnd);
    },
    [handleDragMove, handleDragEnd]
  );

  // Defensive cleanup if the component unmounts mid-drag (e.g. navigating
  // away) — without this, the window listeners above would outlive it.
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  function handlePillClick() {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    setExpanded(true);
  }

  // The pill and the expanded panel are different sizes — re-clamp whenever
  // switching between them so a position saved near an edge never leaves
  // the wider/taller form hanging off-screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    setPosition((pos) =>
      pos ? clampToViewport(pos.x, pos.y, el.offsetWidth, el.offsetHeight) : pos
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // While a native <video> is actually playing, fade the widget out if it's
  // been sitting on top of the player for a couple of seconds — it's meant
  // to help you focus, not block the thing you're watching. Reappears the
  // instant it's no longer overlapping (paused, dragged away, video ends).
  useEffect(() => {
    const timer = setInterval(() => {
      if (isDragging) {
        overlapStartRef.current = null;
        return;
      }
      const playerEl = playerRef?.current;
      const videoEl = document.querySelector('video');
      const widgetEl = rootRef.current;
      const isPlaying = videoEl && !videoEl.paused && !videoEl.ended;

      if (!isPlaying || !playerEl || !widgetEl) {
        overlapStartRef.current = null;
        setAutoHidden(false);
        return;
      }

      const overlapping = rectsOverlap(
        widgetEl.getBoundingClientRect(),
        playerEl.getBoundingClientRect()
      );

      if (!overlapping) {
        overlapStartRef.current = null;
        setAutoHidden(false);
        return;
      }

      if (overlapStartRef.current === null) overlapStartRef.current = Date.now();
      if (Date.now() - overlapStartRef.current >= OVERLAP_HIDE_DELAY_MS) {
        setAutoHidden(true);
      }
    }, OVERLAP_CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playerRef, isDragging]);

  function handleStart() {
    setSessionActive(true);
    setRecap(null);
    setRunning(true);
  }

  function selectPreset(seconds) {
    setRunning(false);
    setPhase('focus');
    setSecondsLeft(seconds);
  }

  function handleReset() {
    setRunning(false);
    setPhase('focus');
    setSecondsLeft(FOCUS_PRESETS[0].seconds);
    setSessionActive(false);
    setGoal('');
    elapsedFocusSecondsRef.current = 0;
  }

  async function handleEndSession() {
    setRunning(false);
    await submitSession();
    setSessionActive(false);
    setPhase('focus');
    setSecondsLeft(FOCUS_PRESETS[0].seconds);
    setGoal('');
  }

  // Fully hides the widget rather than just collapsing it to the pill —
  // wraps up any in-progress session first so closing it never silently
  // loses focus time that was already tracked.
  async function handleClose() {
    setRunning(false);
    if (sessionActive) await submitSession();
    setDismissed(true);
  }

  if (dismissed) return null;

  const positionStyle = position
    ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
    : undefined;
  const visibilityClass = autoHidden && !isDragging ? styles.autoHidden : '';

  const streak = stats?.currentStreak ?? 0;

  if (!expanded) {
    return (
      <div
        ref={rootRef}
        className={`${styles.pill} ${visibilityClass}`}
        style={positionStyle}
        onPointerDown={handleDragStart}
      >
        <button type="button" className={styles.pillMain} onClick={handlePillClick}>
          <FlameIcon className={styles.pillFlame} />
          <span>{streak}</span>
          {running && (
            <>
              <span className={styles.pillDivider} />
              <TimerIcon className={styles.pillTimer} />
              <span className={styles.pillClock}>{formatClock(secondsLeft)}</span>
            </>
          )}
        </button>
        <button
          type="button"
          className={styles.pillClose}
          data-no-drag
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          title="Close"
          aria-label="Close focus timer"
        >
          <CloseIcon />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.widget} ${visibilityClass}`}
      style={positionStyle}
    >
      <div className={styles.header} onPointerDown={handleDragStart}>
        <span className={styles.headerTitle}>
          <TimerIcon className={styles.headerIcon} />
          {phase === 'focus' ? 'Focus session' : 'Break'}
        </span>
        <span className={styles.headerActions} data-no-drag>
          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setExpanded(false)}
            title="Minimize"
            aria-label="Minimize"
          >
            <ChevronDownIcon />
          </button>
          <button
            type="button"
            className={styles.collapseButton}
            onClick={handleClose}
            title="Close"
            aria-label="Close focus timer"
          >
            <CloseIcon />
          </button>
        </span>
      </div>

      {recap ? (
        <div className={styles.recap}>
          <p className={styles.recapHeadline}>Nice work! 🎉</p>
          <p className={styles.recapBody}>
            You focused for <strong>{recap.minutes} min</strong>
            {recap.goal ? (
              <>
                {' '}
                on <strong>&ldquo;{recap.goal}&rdquo;</strong>
              </>
            ) : null}
            .
          </p>
          <p className={styles.recapStreak}>
            <FlameIcon className={styles.recapFlame} /> {recap.streak}-day streak
          </p>
          <button type="button" className={styles.primaryButton} onClick={() => setRecap(null)}>
            Start new session
          </button>
        </div>
      ) : (
        <>
          <div className={styles.goalRow}>
            <TargetIcon className={styles.goalIcon} />
            {sessionActive ? (
              <span className={styles.goalLabel}>{goal || 'No goal set'}</span>
            ) : (
              <input
                className={styles.goalInput}
                placeholder="What are you focusing on?"
                value={goal}
                maxLength={200}
                onChange={(e) => setGoal(e.target.value)}
              />
            )}
          </div>

          <div className={phase === 'break' ? `${styles.clock} ${styles.clockBreak}` : styles.clock}>
            {formatClock(secondsLeft)}
          </div>

          {phase === 'focus' && (
            <div className={styles.presets}>
              {FOCUS_PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  type="button"
                  className={styles.presetButton}
                  onClick={() => selectPreset(p.seconds)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => (running ? setRunning(false) : handleStart())}
              disabled={secondsLeft === 0}
            >
              {running ? 'Pause' : 'Start'}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={handleReset}>
              Reset
            </button>
            {sessionActive && (
              <button type="button" className={styles.secondaryButton} onClick={handleEndSession}>
                End session
              </button>
            )}
          </div>
        </>
      )}

      {stats && (
        <div className={styles.footer}>
          <span>
            <FlameIcon className={styles.footerFlame} /> {stats.currentStreak} day streak
          </span>
          <span>{stats.todayMinutes ?? 0} min today</span>
        </div>
      )}
    </div>
  );
}
