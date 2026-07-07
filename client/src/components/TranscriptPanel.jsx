import { useEffect, useState } from 'react';
import { CloseIcon, SearchIcon } from './ui/Icon';
import { parseVtt } from '../lib/parseVtt';
import { captionUrl } from '../features/videos/videosApi';
import { formatDuration } from '../lib/formatDuration';
import styles from './TranscriptPanel.module.css';

// Built from the caption track you already upload/generate for a video —
// no separate transcription step, just a searchable, clickable view of the
// same .vtt file the <video> element uses for subtitles.
export default function TranscriptPanel({ videoId, onSeek }) {
  const [open, setOpen] = useState(false);
  const [cues, setCues] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open && cues === null) {
      fetch(captionUrl(videoId))
        .then((res) => res.text())
        .then((text) => setCues(parseVtt(text)))
        .catch(() => setCues([]));
    }
  }, [open, cues, videoId]);

  if (!open) {
    return (
      <button type="button" className={styles.toggleButton} onClick={() => setOpen(true)}>
        Show transcript
      </button>
    );
  }

  const filtered =
    cues && query.trim()
      ? cues.filter((c) => c.text.toLowerCase().includes(query.trim().toLowerCase()))
      : cues;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Transcript</span>
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => setOpen(false)}
          aria-label="Close transcript"
        >
          <CloseIcon />
        </button>
      </div>

      <div className={styles.searchRow}>
        <SearchIcon className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Search transcript…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!cues ? (
        <p className={styles.hint}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p className={styles.hint}>{query ? 'No matches.' : 'No transcript available.'}</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((cue) => (
            <li key={cue.start}>
              <button type="button" className={styles.cueButton} onClick={() => onSeek(cue.start)}>
                <span className={styles.cueTime}>{formatDuration(cue.start)}</span>
                <span className={styles.cueText}>{cue.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
