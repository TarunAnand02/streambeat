import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { updateUser } from '../auth/authSlice';
import { useToast } from '../../components/toast/ToastProvider';
import { FlameIcon } from '../../components/ui/Icon';
import Spinner from '../../components/ui/Spinner';
import VideoRow from '../../components/VideoRow';
import DailyViewsChart from '../analytics/DailyViewsChart';
import CategoryBreakdown from '../analytics/CategoryBreakdown';
import { fetchLearningStats } from './learningApi';
import { fetchFocusStats } from '../focus/focusApi';
import { fetchAchievements } from '../achievements/achievementsApi';
import { fetchContinueWatching } from '../history/historyApi';
import { updateProfile } from '../settings/settingsApi';
import { timeAgo } from '../../lib/formatDuration';
import styles from './LearningDashboardPage.module.css';

export default function LearningDashboardPage() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const showToast = useToast();
  const [stats, setStats] = useState(null);
  const [focusStats, setFocusStats] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [continueWatching, setContinueWatching] = useState([]);
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    fetchLearningStats().then(setStats).catch(() => {});
    fetchFocusStats().then(setFocusStats).catch(() => {});
    fetchAchievements().then(setAchievements).catch(() => {});
    fetchContinueWatching().then(setContinueWatching).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.weeklyGoalMinutes != null) setGoalInput(String(user.weeklyGoalMinutes));
  }, [user?.weeklyGoalMinutes]);

  async function handleSaveGoal(e) {
    e.preventDefault();
    const minutes = Number(goalInput);
    if (!Number.isFinite(minutes) || minutes < 0) return;
    setSavingGoal(true);
    try {
      const updated = await updateProfile({ weeklyGoalMinutes: minutes });
      dispatch(updateUser(updated));
      showToast('Weekly goal updated', { type: 'success' });
    } catch {
      showToast('Could not update goal', { type: 'error' });
    } finally {
      setSavingGoal(false);
    }
  }

  if (!stats) return <Spinner />;

  const goalMinutes = user?.weeklyGoalMinutes;
  const goalProgress = goalMinutes
    ? Math.min(100, Math.round((stats.week.minutes / goalMinutes) * 100))
    : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Learning Dashboard</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.today.minutes}</span>
          <span className={styles.statLabel}>minutes today</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.week.minutes}</span>
          <span className={styles.statLabel}>minutes this week</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.month.minutes}</span>
          <span className={styles.statLabel}>minutes this month</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            <FlameIcon className={styles.flameIcon} /> {focusStats?.currentStreak ?? 0}
          </span>
          <span className={styles.statLabel}>day streak (best {focusStats?.longestStreak ?? 0})</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.completedCount}</span>
          <span className={styles.statLabel}>videos completed</span>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Weekly goal</h2>
        <form className={styles.goalForm} onSubmit={handleSaveGoal}>
          <input
            type="number"
            min="0"
            max="10080"
            className={styles.goalInput}
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="e.g. 300"
          />
          <span className={styles.goalUnit}>minutes / week</span>
          <button type="submit" className={styles.goalSaveButton} disabled={savingGoal}>
            {savingGoal ? 'Saving…' : 'Save'}
          </button>
        </form>
        {goalMinutes ? (
          <div className={styles.goalProgress}>
            <div className={styles.goalTrack}>
              <div className={styles.goalFill} style={{ width: `${goalProgress}%` }} />
            </div>
            <span className={styles.goalText}>
              {stats.week.minutes} / {goalMinutes} min ({goalProgress}%)
            </span>
          </div>
        ) : (
          <p className={styles.hint}>Set a weekly goal to track your progress here.</p>
        )}
      </section>

      <div className={styles.chartsGrid}>
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Last 7 days</h2>
          <DailyViewsChart
            days={stats.weeklyActivity.map((d) => ({ date: d.date, count: d.minutes }))}
          />
        </section>
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Categories (last 30 days)</h2>
          {stats.categoryBreakdown.length === 0 ? (
            <p className={styles.hint}>Nothing watched in the last 30 days yet.</p>
          ) : (
            <CategoryBreakdown
              rows={stats.categoryBreakdown.map((c) => ({ category: c.category, views: c.minutes }))}
            />
          )}
        </section>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>
          Achievements{' '}
          {achievements &&
            `(${achievements.filter((a) => a.unlocked).length}/${achievements.length})`}
        </h2>
        {achievements && (
          <div className={styles.achievementsGrid}>
            {achievements.map((a) => (
              <div
                key={a.code}
                className={a.unlocked ? styles.badge : `${styles.badge} ${styles.badgeLocked}`}
                title={a.description}
              >
                <span className={styles.badgeTitle}>{a.title}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <VideoRow title="Continue watching" videos={continueWatching} />

      {stats.recentlyCompleted.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Recently completed</h2>
          <ul className={styles.completedList}>
            {stats.recentlyCompleted.map((c) => (
              <li key={c.videoId} className={styles.completedItem}>
                <Link to={`/watch/${c.videoId}`} className={styles.completedTitle}>
                  {c.title}
                </Link>
                <span className={styles.completedTime}>{timeAgo(c.watchedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
