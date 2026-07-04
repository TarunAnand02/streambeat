import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { updateUser } from './authSlice';
import { fetchMe, verifyEmail } from './authApi';
import styles from './AuthForm.module.css';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState(token ? 'verifying' : 'missing');
  const [error, setError] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifyEmail(token)
      .then(async () => {
        if (cancelled) return;
        setStatus('success');
        // Re-fetch rather than trust whatever `user` this tab had cached at
        // mount — if the session was still being restored when the link was
        // clicked (e.g. opened fresh from an email client), the cached copy
        // would still show emailVerified: false even though the server-side
        // flag is now correctly set. Silently ignore failure (not logged in
        // in this tab at all) — nothing to update locally in that case.
        const freshUser = await fetchMe().catch(() => null);
        if (!cancelled && freshUser) dispatch(updateUser(freshUser));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || 'That verification link is invalid or has expired');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>StreamBeat</div>
        {status === 'missing' && (
          <div className={styles.error}>This verification link is missing its token.</div>
        )}
        {status === 'verifying' && <p>Verifying your email…</p>}
        {status === 'success' && <p>Your email has been verified.</p>}
        {status === 'error' && <div className={styles.error}>{error}</div>}
        <div className={styles.footer}>
          <Link to="/">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
