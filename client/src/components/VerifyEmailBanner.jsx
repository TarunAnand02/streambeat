import { useState } from 'react';
import { resendVerification } from '../features/auth/authApi';
import { useAuth } from '../hooks/useAuth';
import { CloseIcon } from './ui/Icon';
import styles from './VerifyEmailBanner.module.css';

export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  async function handleResend() {
    setSending(true);
    try {
      await resendVerification();
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.banner}>
      <span>
        {sent
          ? 'Verification email sent — check your inbox.'
          : 'Please verify your email address.'}
      </span>
      {!sent && (
        <button type="button" className={styles.resendButton} onClick={handleResend} disabled={sending}>
          {sending ? 'Sending…' : 'Resend email'}
        </button>
      )}
      <button
        type="button"
        className={styles.dismissButton}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
