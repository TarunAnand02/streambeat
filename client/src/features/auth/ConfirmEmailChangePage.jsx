import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { updateUser } from './authSlice';
import { useAuth } from '../../hooks/useAuth';
import { confirmEmailChange } from './authApi';
import styles from './AuthForm.module.css';

export default function ConfirmEmailChangePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState(token ? 'confirming' : 'missing');
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    confirmEmailChange(token)
      .then((user) => {
        if (cancelled) return;
        setStatus('success');
        // Only update Redux if this tab happens to be signed in as the same
        // account the link belongs to — otherwise this tab's active account
        // has nothing to do with the confirmed one, and overwriting it here
        // would show the wrong account's data.
        if (currentUser?.id === user.id) dispatch(updateUser(user));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || 'That confirmation link is invalid or has expired');
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
          <div className={styles.error}>This confirmation link is missing its token.</div>
        )}
        {status === 'confirming' && <p>Confirming your new email address…</p>}
        {status === 'success' && <p>Your email address has been updated.</p>}
        {status === 'error' && <div className={styles.error}>{error}</div>}
        <div className={styles.footer}>
          <Link to="/">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
