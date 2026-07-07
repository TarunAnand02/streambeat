import { useTheme } from '../../hooks/useTheme';
import styles from './SettingsPage.module.css';

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
  { value: 'amoled', label: 'AMOLED' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'glassmorphism', label: 'Glassmorphism' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
];

export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>Appearance</h2>
      <p className={styles.hint}>Choose how StreamBeat looks on this device.</p>
      <div className={styles.themeOptions}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={theme === opt.value ? `${styles.themeOption} ${styles.themeOptionActive}` : styles.themeOption}
            onClick={() => setTheme(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );
}
