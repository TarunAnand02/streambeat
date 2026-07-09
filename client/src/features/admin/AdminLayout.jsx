import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  ChartIcon,
  ClipboardIcon,
  DatabaseIcon,
  FilmIcon,
  FlagIcon,
  GaugeIcon,
  QueueIcon,
  SettingsIcon,
  UsersIcon,
} from '../../components/ui/Icon';
import shared from './AdminShared.module.css';
import styles from './AdminLayout.module.css';

const sections = [
  { to: '/admin', label: 'Dashboard', Icon: GaugeIcon, end: true },
  { to: '/admin/users', label: 'Users', Icon: UsersIcon },
  { to: '/admin/videos', label: 'Videos', Icon: FilmIcon },
  { to: '/admin/reports', label: 'Reports', Icon: FlagIcon },
  { to: '/admin/uploads', label: 'Upload Monitor', Icon: QueueIcon },
  { to: '/admin/storage', label: 'Storage', Icon: DatabaseIcon },
  { to: '/admin/analytics', label: 'Analytics', Icon: ChartIcon },
  { to: '/admin/settings', label: 'Settings', Icon: SettingsIcon },
  { to: '/admin/activity', label: 'Activity Logs', Icon: ClipboardIcon },
];

export default function AdminLayout() {
  const { user, initialized } = useAuth();

  if (!initialized) return null;
  if (!user?.isAdmin) return <p className={shared.notAuthorized}>Admins only.</p>;

  return (
    <div className={styles.wrapper}>
      <nav className={styles.nav}>
        {sections.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? `${styles.navItem} ${styles.active}` : styles.navItem)}
          >
            <Icon className={styles.navIcon} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
