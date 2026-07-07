import { NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { updateUser } from '../../features/auth/authSlice';
import { updateProfile } from '../../features/settings/settingsApi';
import { useToast } from '../toast/ToastProvider';
import {
  BellIcon,
  ChannelIcon,
  ChartIcon,
  ClockIcon,
  CloseIcon,
  FlagIcon,
  FlameIcon,
  FocusIcon,
  FolderIcon,
  HelpIcon,
  HomeIcon,
  ImportIcon,
  SettingsIcon,
  TargetIcon,
  UploadIcon,
} from '../ui/Icon';
import styles from './Sidebar.module.css';

const navItems = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/subscriptions', label: 'Subscriptions', Icon: BellIcon, protected: true },
  { to: '/upload', label: 'Upload', Icon: UploadIcon, protected: true },
  { to: '/import', label: 'Import', Icon: ImportIcon, protected: true },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAuthenticated } = useAuth();
  const dispatch = useDispatch();
  const showToast = useToast();

  async function handleToggleStudyMode() {
    const next = !user.studyModeEnabled;
    dispatch(updateUser({ ...user, studyModeEnabled: next }));
    try {
      await updateProfile({ studyModeEnabled: next });
    } catch {
      dispatch(updateUser({ ...user, studyModeEnabled: !next }));
      showToast('Could not update Study Mode', { type: 'error' });
    }
  }

  return (
    <aside className={isOpen ? `${styles.sidebar} ${styles.open}` : styles.sidebar}>
      <div className={styles.topRow}>
        <div className={styles.logo}>StreamBeat</div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close menu">
          <CloseIcon />
        </button>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) =>
          item.protected && !isAuthenticated ? null : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
              end={item.to === '/'}
            >
              <span className={styles.icon}>
                <item.Icon />
              </span>
              {item.label}
            </NavLink>
          )
        )}
      </nav>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Library</div>
        {isAuthenticated ? (
          <>
            <NavLink
              to={`/channel/${user.id}`}
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <span className={styles.icon}>
                <ChannelIcon />
              </span>
              Your Channel
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <span className={styles.icon}>
                <TargetIcon />
              </span>
              Dashboard
            </NavLink>
            <NavLink
              to="/watch-later"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <span className={styles.icon}>
                <ClockIcon />
              </span>
              Watch Later
            </NavLink>
            <NavLink
              to="/collections"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <span className={styles.icon}>
                <FolderIcon />
              </span>
              Collections
            </NavLink>
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <span className={styles.icon}>
                <ChartIcon />
              </span>
              Analytics
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <span className={styles.icon}>
                <ClockIcon />
              </span>
              History
            </NavLink>
          </>
        ) : (
          <p className={styles.hint}>Log in to see your channel</p>
        )}
      </div>

      {isAuthenticated && (
        <div className={styles.section}>
          <button
            type="button"
            className={
              user.studyModeEnabled
                ? `${styles.navItem} ${styles.toggleButton} ${styles.studyModeActive}`
                : `${styles.navItem} ${styles.toggleButton}`
            }
            onClick={handleToggleStudyMode}
            title="Hide recommendations/trending for distraction-free viewing"
          >
            <span className={styles.icon}>
              <FocusIcon />
            </span>
            Study Mode
            {user.focusStats?.currentStreak > 0 && (
              <span className={styles.streakBadge}>
                <FlameIcon /> {user.focusStats.currentStreak}
              </span>
            )}
          </button>
          {user.isAdmin && (
            <NavLink
              to="/admin/reports"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <span className={styles.icon}>
                <FlagIcon />
              </span>
              Reports
            </NavLink>
          )}
        </div>
      )}

      <div className={styles.spacer} />

      {isAuthenticated && (
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
          }
        >
          <span className={styles.icon}>
            <SettingsIcon />
          </span>
          Settings
        </NavLink>
      )}

      <NavLink
        to="/help"
        className={({ isActive }) =>
          isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
        }
      >
        <span className={styles.icon}>
          <HelpIcon />
        </span>
        Help
      </NavLink>
    </aside>
  );
}
