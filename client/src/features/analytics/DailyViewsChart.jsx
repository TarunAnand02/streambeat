import styles from './DailyViewsChart.module.css';

export default function DailyViewsChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className={styles.chart}>
      {days.map((d) => (
        <div
          key={d.date}
          className={styles.barWrapper}
          title={`${d.date}: ${d.count} view${d.count === 1 ? '' : 's'}`}
        >
          <div className={styles.bar} style={{ height: `${(d.count / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}
