import { useEffect, useRef, useState } from 'react';
import { TimerIcon } from './ui/Icon';
import { useToast } from './toast/ToastProvider';
import styles from './FocusTimer.module.css';

const PRESETS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '15 min', seconds: 15 * 60 },
  { label: '5 min', seconds: 5 * 60 },
];

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// A simple Pomodoro-style focus timer — only shown in Study Mode. Entirely
// client-side (no need to persist a running countdown server-side); resets
// if the page reloads, same as any other in-session widget.
export default function FocusTimer() {
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].seconds);
  const [running, setRunning] = useState(false);
  const showToast = useToast();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          showToast('Focus session complete — take a break!', { type: 'success' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function selectPreset(seconds) {
    setRunning(false);
    setSecondsLeft(seconds);
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <TimerIcon className={styles.headerIcon} />
        Focus timer
      </div>
      <div className={styles.clock}>{formatClock(secondsLeft)}</div>
      <div className={styles.presets}>
        {PRESETS.map((p) => (
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
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => setRunning((v) => !v)}
          disabled={secondsLeft === 0}
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setRunning(false);
            setSecondsLeft(PRESETS[0].seconds);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
