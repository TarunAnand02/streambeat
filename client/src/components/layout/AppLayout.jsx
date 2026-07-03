import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar />
        <div className={styles.content}>
          <div key={location.pathname} className={styles.pageEnter}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
