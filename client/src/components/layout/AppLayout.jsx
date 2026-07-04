import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PersistentPlayerBar from './PersistentPlayerBar';
import VerifyEmailBanner from '../VerifyEmailBanner';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentVideo = useSelector((state) => state.player.currentVideo);
  const playerBarVisible = currentVideo && location.pathname !== `/watch/${currentVideo.id}`;

  // Close the mobile drawer automatically on navigation — otherwise it'd
  // stay open over the new page, which reads as broken rather than "a menu
  // you keep open across pages" (unlike the always-visible desktop sidebar).
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={styles.shell}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={styles.main}>
        <Topbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <VerifyEmailBanner />
        <div className={playerBarVisible ? `${styles.content} ${styles.contentWithPlayerBar}` : styles.content}>
          <div key={location.pathname} className={styles.pageEnter}>
            <Outlet />
          </div>
        </div>
      </div>
      <PersistentPlayerBar />
    </div>
  );
}
