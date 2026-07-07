import { useState } from 'react';
import { CloseIcon } from '../../components/ui/Icon';
import { useToast } from '../../components/toast/ToastProvider';
import { createReport } from './reportsApi';
import styles from './ReportModal.module.css';

const REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'violence', label: 'Violence or dangerous content' },
  { value: 'copyright', label: 'Copyright infringement' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other', label: 'Other' },
];

// targetType/targetId identify what's being reported; onClose is always
// called after either a successful submit or a cancel.
export default function ReportModal({ targetType, targetId, onClose }) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReport({ targetType, targetId, reason, details: details.trim() });
      showToast('Report submitted — thanks for helping keep StreamBeat safe', { type: 'success' });
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not submit report', { type: 'error' });
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Report {targetType}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.reasonList}>
            {REASONS.map((r) => (
              <label key={r.value} className={styles.reasonItem}>
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>
          <textarea
            className={styles.details}
            placeholder="Additional details (optional)"
            maxLength={500}
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <div className={styles.actions}>
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
