import { useEffect, useState } from 'react';
import { fetchVideoAnalytics } from './analyticsApi';
import { ChartIcon } from '../../components/ui/Icon';
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
