import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import OAuthButtons from './OAuthButtons';
import { loginUser, verifyTwoFactorLogin } from './authSlice';
import styles from './AuthForm.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [code, setCode] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { status, error } = useSelector((state) => state.auth);

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      if (result.payload.requires2FA) {
        setTempToken(result.payload.tempToken);
      } else {
        navigate(location.state?.from?.pathname || '/', { replace: true });
      }
    }
  }

  async function handleVerifySubmit(e) {
    e.preventDefault();
    const result = await dispatch(verifyTwoFactorLogin({ tempToken, code }));
    if (verifyTwoFactorLogin.fulfilled.match(result)) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  }

  if (tempToken) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.logo}>StreamBeat</div>
          {error && <div className={styles.error}>{error}</div>}
          <form onSubmit={handleVerifySubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="code">
                Authentication code
              </label>
              <input
                id="code"
                className={styles.input}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                placeholder="6-digit code or backup code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <button className={styles.submit} type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Verifying…' : 'Verify'}
            </button>
          </form>
          <div className={styles.footer}>
            <button type="button" className={styles.inlineLink} onClick={() => setTempToken(null)}>
              Back to log in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>StreamBeat</div>
        {location.state?.resetSuccess && (
          <div className={styles.success}>Your password has been reset — log in below.</div>
        )}
        {searchParams.get('oauthError') && (
          <div className={styles.error}>That sign-in attempt didn't work — please try again.</div>
        )}
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <Link className={styles.inlineLink} to="/forgot-password">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className={styles.submit} type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <OAuthButtons />
        <div className={styles.footer}>
          Don't have an account? <Link to="/register">Sign up</Link>
        </div>
        <div className={styles.footer}>
          <Link to="/help">Need help?</Link>
        </div>
      </div>
    </div>
  );
}
