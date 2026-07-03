import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from './authApi';
import styles from './AuthForm.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await forgotPassword(email);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>StreamBeat</div>

        {result ? (
          <>
            <p>{result.message}</p>
            {result.devResetUrl && (
              <p className={styles.footer}>
                Dev mode (no email server configured) —{' '}
                <Link to={result.devResetUrl.replace(window.location.origin, '')}>open the reset link</Link>
              </p>
            )}
          </>
        ) : (
          <>
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
              <button className={styles.submit} type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <div className={styles.footer}>
          <Link to="/login">Back to log in</Link>
        </div>
      </div>
    </div>
  );
}
