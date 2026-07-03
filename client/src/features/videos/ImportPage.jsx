import { useState } from 'react';
import ImportChannelForm from './ImportChannelForm';
import ImportUrlForm from './ImportUrlForm';
import ImportVideoForm from './ImportVideoForm';
import uploadStyles from './UploadPage.module.css';
import styles from './ImportPage.module.css';

export default function ImportPage() {
  const [mode, setMode] = useState('video');

  return (
    <div className={uploadStyles.page} style={mode === 'channel' ? { maxWidth: 960 } : undefined}>
      <h1 className={uploadStyles.heading}>Import</h1>

      <div className={styles.tabs}>
        <button
          className={mode === 'video' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setMode('video')}
        >
          YouTube video
        </button>
        <button
          className={mode === 'channel' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setMode('channel')}
        >
          YouTube channel
        </button>
        <button
          className={mode === 'url' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setMode('url')}
        >
          From URL
        </button>
      </div>

      {mode === 'video' && <ImportVideoForm />}
      {mode === 'channel' && <ImportChannelForm />}
      {mode === 'url' && <ImportUrlForm />}
    </div>
  );
}
