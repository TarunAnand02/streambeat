import { CloseIcon } from './ui/Icon';
import styles from './KeyboardShortcutsModal.module.css';

const GROUPS = [
  {
    title: 'Playback',
    shortcuts: [
      { keys: ['Space', 'K'], description: 'Play / pause' },
      { keys: ['J'], description: 'Rewind 10 seconds' },
      { keys: ['L'], description: 'Forward 10 seconds' },
      { keys: ['←'], description: 'Rewind 5 seconds' },
      { keys: ['→'], description: 'Forward 5 seconds' },
      { keys: ['0', '…', '9'], description: 'Jump to 0%–90% of the video' },
      { keys: ['Home'], description: 'Jump to the start' },
      { keys: ['End'], description: 'Jump to the end' },
    ],
  },
  {
    title: 'Audio & display',
    shortcuts: [
      { keys: ['M'], description: 'Mute / unmute' },
      { keys: ['↑'], description: 'Volume up' },
      { keys: ['↓'], description: 'Volume down' },
      { keys: ['C'], description: 'Toggle captions' },
      { keys: ['F'], description: 'Toggle fullscreen' },
      { keys: ['T'], description: 'Toggle theater mode' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['/'], description: 'Focus search' },
      { keys: ['?'], description: 'Show this list' },
    ],
  },
];

export default function KeyboardShortcutsModal({ onClose }) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Keyboard shortcuts</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        {GROUPS.map((group) => (
          <div key={group.title} className={styles.group}>
            <h3 className={styles.groupTitle}>{group.title}</h3>
            <ul className={styles.list}>
              {group.shortcuts.map((s) => (
                <li key={s.description} className={styles.row}>
                  <span className={styles.keys}>
                    {s.keys.map((k) => (
                      <kbd key={k} className={styles.key}>
                        {k}
                      </kbd>
                    ))}
                  </span>
                  <span className={styles.description}>{s.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
