import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { updateUser } from './authSlice';
import { useAuth } from '../../hooks/useAuth';
import { verifyEmail } from './authApi';
import styles from './AuthForm.module.css';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState(token ? 'verifying' : 'missing');
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        setStatus('success');
        if (user) dispatch(updateUser({ ...user, emailVerified: true }));
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
