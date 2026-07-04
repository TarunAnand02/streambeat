import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  BellIcon,
  ChannelIcon,
  ChartIcon,
  ClockIcon,
  CloseIcon,
  FolderIcon,
  HelpIcon,
  HomeIcon,
  ImportIcon,
  SettingsIcon,
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
