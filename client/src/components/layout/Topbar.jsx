import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../features/auth/authSlice';
import { useAuth } from '../../hooks/useAuth';
import NotificationsMenu from '../../features/notifications/NotificationsMenu';
import { suggestVideos, thumbnailUrl } from '../../features/videos/videosApi';
import { MenuIcon } from '../ui/Icon';
import styles from './Topbar.module.css';

export default function Topbar({ onMenuClick }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useAuth();

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

  return (
    <header className={styles.topbar}>
      <button type="button" className={styles.menuButton} onClick={onMenuClick} aria-label="Open menu">
        <MenuIcon />
      </button>
      <div className={styles.searchWrapper} ref={searchRef}>
        <form className={styles.searchForm} onSubmit={handleSubmit}>
          <input
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
              {user.username.charAt(0).toUpperCase()}
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
