import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { timeAgo } from '../../lib/formatDuration';
import { useToast } from '../../components/toast/ToastProvider';
import { fetchReports, updateReportStatus } from './reportsApi';
import styles from './AdminReportsPage.module.css';

const REASON_LABELS = {
  spam: 'Spam or misleading',
  harassment: 'Harassment or bullying',
  violence: 'Violence or dangerous content',
  copyright: 'Copyright infringement',
  nudity: 'Nudity or sexual content',
  misinformation: 'Misinformation',
  other: 'Other',
};

export default function AdminReportsPage() {
  const { user, initialized } = useAuth();
  const [reports, setReports] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const showToast = useToast();

  useEffect(() => {
    if (!user?.isAdmin) return;
    fetchReports('open')
      .then(setReports)
      .catch(() => setReports([]));
  }, [user?.isAdmin]);

  async function handleResolve(id, status) {
    setBusyId(id);
    try {
      await updateReportStatus(id, status);
      setReports((prev) => prev.filter((r) => r._id !== id));
    } catch {
      showToast('Could not update report', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  if (!initialized) return null;
  if (!user?.isAdmin) return <p className={styles.notAuthorized}>Admins only.</p>;
  if (reports === null) return <p>Loading…</p>;

  return (
    <div>
      <h1 className={styles.heading}>Reports</h1>
      {reports.length === 0 ? (
        <p className={styles.empty}>No open reports — all clear.</p>
      ) : (
        <ul className={styles.list}>
          {reports.map((report) => (
            <li key={report._id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.reason}>{REASON_LABELS[report.reason]}</span>
                <span className={styles.time}>{timeAgo(report.createdAt)}</span>
              </div>
              <div className={styles.meta}>
                Reported {report.targetType}
                {report.target ? (
                  report.targetType === 'video' ? (
                    <>
                      : <Link to={`/watch/${report.targetId}`}>{report.target.title}</Link>
                    </>
                  ) : (
                    <>: "{report.target.text.slice(0, 80)}"</>
                  )
                ) : (
                  ' (since deleted)'
                )}
              </div>
              <div className={styles.meta}>Reported by {report.reporter?.username}</div>
              {report.details && <p className={styles.details}>{report.details}</p>}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.resolveButton}
                  onClick={() => handleResolve(report._id, 'resolved')}
                  disabled={busyId === report._id}
                >
                  Mark resolved
                </button>
                <button
                  type="button"
                  className={styles.dismissButton}
                  onClick={() => handleResolve(report._id, 'dismissed')}
                  disabled={busyId === report._id}
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
