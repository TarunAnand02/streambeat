import { useEffect, useState } from 'react';
import { fetchVideoAnalytics } from './analyticsApi';
import { ChartIcon, CloseIcon } from '../../components/ui/Icon';
import DailyViewsChart from './DailyViewsChart';
import styles from './VideoAnalyticsPanel.module.css';

export default function VideoAnalyticsPanel({ videoId }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (open && !data) {
      fetchVideoAnalytics(videoId).then(setData);
    }
  }, [open, data, videoId]);

  if (!open) {
    return (
      <button type="button" className={styles.toggleButton} onClick={() => setOpen(true)}>
        <ChartIcon className={styles.inlineIcon} /> View analytics
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <ChartIcon className={styles.inlineIcon} /> Video analytics
        </span>
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => setOpen(false)}
          aria-label="Close analytics"
        >
          <CloseIcon />
        </button>
      </div>
      {!data ? (
        <p className={styles.hint}>Loading…</p>
      ) : (
        <>
          <div className={styles.stats}>
            <span>{data.video.views} views</span>
            <span>{data.video.likesCount} likes</span>
            <span>{data.commentsCount} comments</span>
          </div>
          <DailyViewsChart days={data.viewsByDay} />
        </>
      )}
    </div>
  );
}
