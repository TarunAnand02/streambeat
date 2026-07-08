import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  ChartIcon,
  ClockIcon,
  FolderIcon,
  HelpIcon,
  HomeIcon,
  ImportIcon,
  SearchIcon,
  SettingsIcon,
  TargetIcon,
  UploadIcon,
} from './ui/Icon';
import { useAuth } from '../hooks/useAuth';
import { suggestVideos, thumbnailUrl } from '../features/videos/videosApi';
import styles from './CommandPalette.module.css';

const NAV_COMMANDS = [
  { label: 'Home', path: '/', Icon: HomeIcon },
  { label: 'Upload', path: '/upload', Icon: UploadIcon, protected: true },
  { label: 'Import from YouTube', path: '/import', Icon: ImportIcon, protected: true },
  { label: 'Collections', path: '/collections', Icon: FolderIcon, protected: true },
  { label: 'Watch Later', path: '/watch-later', Icon: ClockIcon, protected: true },
  { label: 'History', path: '/history', Icon: ClockIcon, protected: true },
  { label: 'Learning Dashboard', path: '/dashboard', Icon: TargetIcon, protected: true },
  { label: 'Analytics', path: '/analytics', Icon: ChartIcon, protected: true },
  { label: 'Notifications', path: '/notifications', Icon: BellIcon, protected: true },
  { label: 'Settings', path: '/settings', Icon: SettingsIcon, protected: true },
  { label: 'Help', path: '/help', Icon: HelpIcon },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [videoResults, setVideoResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      const isCombo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (!isCombo) return;
      e.preventDefault();
      setOpen((v) => !v);
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setVideoResults([]);
      setActiveIndex(0);
      // Wait a tick for the input to actually mount before focusing it.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setVideoResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      suggestVideos(trimmed).then((results) => {
        if (!cancelled) setVideoResults(results);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  const matchingCommands = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return NAV_COMMANDS.filter((c) => !c.protected || isAuthenticated).filter(
      (c) => !trimmed || c.label.toLowerCase().includes(trimmed)
    );
  }, [query, isAuthenticated]);

  // A single flat list drives keyboard navigation regardless of which
  // section (commands vs videos) an entry visually belongs to.
  const flatResults = useMemo(
    () => [
      ...matchingCommands.map((c) => ({ type: 'command', ...c })),
      ...videoResults.map((v) => ({ type: 'video', ...v })),
    ],
    [matchingCommands, videoResults]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [flatResults.length]);

  function close() {
    setOpen(false);
  }

  function activate(item) {
    if (!item) return;
    if (item.type === 'command') navigate(item.path);
    else navigate(`/watch/${item._id}`);
    close();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(flatResults[activeIndex]);
    }
  }

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={close}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchRow}>
          <SearchIcon className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Search videos or jump to a page…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className={styles.escHint}>Esc</kbd>
        </div>

        {flatResults.length === 0 ? (
          <p className={styles.empty}>No matches.</p>
        ) : (
          <div className={styles.results}>
            {matchingCommands.length > 0 && (
              <div className={styles.group}>
                <div className={styles.groupLabel}>Go to</div>
                {matchingCommands.map((c) => {
                  const index = flatResults.findIndex((f) => f.type === 'command' && f.path === c.path);
                  return (
                    <button
                      key={c.path}
                      type="button"
                      className={index === activeIndex ? `${styles.result} ${styles.resultActive}` : styles.result}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => activate({ type: 'command', ...c })}
                    >
                      <c.Icon className={styles.resultIcon} />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {videoResults.length > 0 && (
              <div className={styles.group}>
                <div className={styles.groupLabel}>Videos</div>
                {videoResults.map((v) => {
                  const index = flatResults.findIndex((f) => f.type === 'video' && f._id === v._id);
                  return (
                    <button
                      key={v._id}
                      type="button"
                      className={index === activeIndex ? `${styles.result} ${styles.resultActive}` : styles.result}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => activate({ type: 'video', ...v })}
                    >
                      <span className={styles.resultThumb}>
                        {v.source === 'youtube'
                          ? v.youtubeThumbnailUrl && <img src={v.youtubeThumbnailUrl} alt="" />
                          : v.thumbnailFilename && <img src={thumbnailUrl(v._id)} alt="" />}
                      </span>
                      <span className={styles.resultTitle}>{v.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
