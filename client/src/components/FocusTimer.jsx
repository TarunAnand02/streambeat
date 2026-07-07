import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, FlameIcon, TargetIcon, TimerIcon } from './ui/Icon';
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

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// A Pomodoro-style focus HUD shown only in Study Mode. Tracks real elapsed
// focus time (not just wall-clock session length) so pausing doesn't inflate
// the minutes eventually logged to the server for streaks/recap.
export default function FocusTimer({ videoId }) {
  const [expanded, setExpanded] = useState(false);
  const [phase, setPhase] = useState('focus');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_PRESETS[0].seconds);
  const [running, setRunning] = useState(false);
  const [goal, setGoal] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [stats, setStats] = useState(null);
  const [recap, setRecap] = useState(null);
  const showToast = useToast();

  const intervalRef = useRef(null);
  const elapsedFocusSecondsRef = useRef(0);
  const goalRef = useRef('');
  const submittedRef = useRef(false);

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

  const streak = stats?.currentStreak ?? 0;

  if (!expanded) {
    return (
      <button type="button" className={styles.pill} onClick={() => setExpanded(true)}>
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
    );
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          <TimerIcon className={styles.headerIcon} />
          {phase === 'focus' ? 'Focus session' : 'Break'}
        </span>
        <button
          type="button"
          className={styles.collapseButton}
          onClick={() => setExpanded(false)}
          aria-label="Collapse"
        >
          <ChevronDownIcon />
        </button>
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
