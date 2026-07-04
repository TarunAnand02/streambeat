import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchMe } from './authApi';
import { setCredentials } from './authSlice';
import styles from './AuthForm.module.css';

// Lands here after a Google/GitHub redirect. The access token travels in the
// URL fragment (#token=...), not a query string — fragments are never sent
// to the server on subsequent requests or logged by it, unlike query params.
export default function OAuthCallbackPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));

    // The account has 2FA enabled — OAuth alone isn't enough to log in, same
    // rule the password login form already enforces. Hand off to the login
    // page's existing TOTP/backup-code step instead of finishing sign-in.
    if (hash.get('requires2FA')) {
      const tempToken = hash.get('tempToken');
      navigate('/login', { replace: true, state: { oauthTempToken: tempToken } });
      return;
    }

    const accessToken = hash.get('token');
    if (!accessToken) {
      setError(true);
      return;
    }

    // The axios interceptor reads the token from the store at request time,
    // so it has to land there before fetchMe() can succeed — dispatch a
    // placeholder first, then fill in the real user once fetched.
    dispatch(setCredentials({ user: null, accessToken }));
    fetchMe()
      .then((user) => {
        dispatch(setCredentials({ user, accessToken }));
        navigate('/', { replace: true });
      })
      .catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.logo}>StreamBeat</div>
          <div className={styles.error}>That sign-in attempt didn't work.</div>
          <div className={styles.footer}>
            <Link to="/login">Back to log in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>StreamBeat</div>
        <p>Signing you in…</p>
      </div>
    </div>
  );
}
