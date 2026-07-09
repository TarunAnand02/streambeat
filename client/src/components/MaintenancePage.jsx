import { WrenchIcon } from './ui/Icon';
import styles from './MaintenancePage.module.css';

export default function MaintenancePage({ siteName }) {
  return (
    <div className={styles.wrapper}>
      <WrenchIcon className={styles.icon} aria-hidden="true" />
      <h1 className={styles.heading}>{siteName || 'StreamBeat'} is down for maintenance</h1>
      <p className={styles.text}>We're making some improvements and will be back shortly.</p>
    </div>
  );
}
