import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Sidebar.module.css';

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/upload', label: 'Upload', icon: '⬆️', protected: true },
  { to: '/import', label: 'Import', icon: '📥', protected: true },
];

export default function Sidebar() {
  const { user, isAuthenticated } = useAuth();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>StreamBeat</div>
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
              <span className={styles.icon}>{item.icon}</span>
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
              <span className={styles.icon}>📺</span>
              Your Channel
            </NavLink>
            <NavLink
              to="/collections"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <span className={styles.icon}>📁</span>
              Collections
            </NavLink>
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <span className={styles.icon}>📊</span>
              Analytics
            </NavLink>
          </>
        ) : (
          <p className={styles.hint}>Log in to see your channel</p>
        )}
      </div>

      <div className={styles.spacer} />

      <NavLink
        to="/help"
        className={({ isActive }) =>
          isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
        }
      >
        <span className={styles.icon}>❓</span>
        Help
      </NavLink>
    </aside>
  );
}
