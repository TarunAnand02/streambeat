import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutUser, switchAccount } from '../../features/auth/authSlice';
import { useToast } from '../toast/ToastProvider';
import { useAuth } from '../../hooks/useAuth';
import NotificationsMenu from '../../features/notifications/NotificationsMenu';
import { suggestVideos, thumbnailUrl } from '../../features/videos/videosApi';
import Avatar from '../ui/Avatar';
import { MenuIcon } from '../ui/Icon';
import styles from './Topbar.module.css';

export default function Topbar({ onMenuClick }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const showToast = useToast();
  const { user, isAuthenticated } = useAuth();
  const otherAccounts = useSelector((state) =>
    state.auth.accounts.filter((a) => a.id !== user?.id)
  );

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global "/" to jump into search from anywhere — ignored while already
  // typing somewhere else so it doesn't hijack normal text entry.
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if (e.key !== '/') return;
      const el = e.target;
      const isTyping = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (isTyping) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.toLowerCase().startsWith('tag:')) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      suggestVideos(trimmed).then((results) => {
        if (!cancelled) setSuggestions(results);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function runSearch(trimmed) {
    if (!trimmed) return;
    setShowSuggestions(false);
    if (trimmed.toLowerCase().startsWith('tag:')) {
      const tag = trimmed.slice(4).trim();
      if (tag) navigate(`/search?tag=${encodeURIComponent(tag)}`);
      return;
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    runSearch(query.trim());
  }

  function handleSuggestionClick(video) {
    setShowSuggestions(false);
    setQuery('');
    navigate(`/watch/${video._id}`);
  }

  async function handleLogout() {
    await dispatch(logoutUser());
    setMenuOpen(false);
    navigate('/login');
  }

  async function handleSwitchAccount(account) {
    setMenuOpen(false);
    const result = await dispatch(switchAccount(account.id));
    if (switchAccount.fulfilled.match(result)) {
      // Any page currently open may hold data scoped to the account we just
      // left (e.g. Settings, a channel's own edit controls) — send to Home
      // rather than risk stale owner-context sticking around in place.
      navigate('/');
    } else {
      showToast(`Couldn't switch to ${account.username} — try logging in again`, { type: 'error' });
    }
  }

  return (
    <header className={styles.topbar}>
      <button type="button" className={styles.menuButton} onClick={onMenuClick} aria-label="Open menu">
        <MenuIcon />
      </button>
      <div className={styles.searchWrapper} ref={searchRef}>
        <form className={styles.searchForm} onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="search"
            placeholder="Search videos, or tag:xxxx"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => e.key === 'Escape' && setShowSuggestions(false)}
          />
        </form>

        {showSuggestions && suggestions.length > 0 && (
          <div className={styles.suggestions}>
            {suggestions.map((video) => (
              <button
                key={video._id}
                className={styles.suggestionItem}
                onClick={() => handleSuggestionClick(video)}
              >
                <div className={styles.suggestionThumb}>
                  {video.source === 'youtube' ? (
                    video.youtubeThumbnailUrl && (
                      <img src={video.youtubeThumbnailUrl} alt="" />
                    )
                  ) : (
                    video.thumbnailFilename && <img src={thumbnailUrl(video._id)} alt="" />
                  )}
                </div>
                <span className={styles.suggestionTitle}>{video.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {isAuthenticated && <NotificationsMenu />}
        {isAuthenticated ? (
          <div className={styles.menuWrapper} ref={menuRef}>
            <button className={styles.avatar} onClick={() => setMenuOpen((v) => !v)}>
              <Avatar username={user.username} avatarUrl={user.avatarUrl} size={36} />
            </button>
            {menuOpen && (
              <div className={styles.menu}>
                <div className={styles.menuUsername}>{user.username}</div>
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/channel/${user.id}`);
                  }}
                >
                  Your Channel
                </button>
                <button className={styles.menuItem} onClick={handleLogout}>
                  Log out
                </button>

                {otherAccounts.length > 0 && (
                  <>
                    <div className={styles.menuDivider} />
                    <div className={styles.menuSectionLabel}>Switch account</div>
                    {otherAccounts.map((account) => (
                      <button
                        key={account.id}
                        className={styles.accountItem}
                        onClick={() => handleSwitchAccount(account)}
                      >
                        <Avatar username={account.username} avatarUrl={account.avatarUrl} size={24} />
                        {account.username}
                      </button>
                    ))}
                  </>
                )}
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/login');
                  }}
                >
                  + Add another account
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className={styles.loginButton} onClick={() => navigate('/login')}>
            Log in
          </button>
        )}
      </div>
    </header>
  );
}
