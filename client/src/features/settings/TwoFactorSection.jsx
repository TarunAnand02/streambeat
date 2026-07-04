import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateUser } from '../auth/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/toast/ToastProvider';
import { disable2fa, enable2fa, setup2fa } from './settingsApi';
import styles from './SettingsPage.module.css';

// 'idle' -> 'setup' (QR shown, waiting for a code to confirm) -> 'backupCodes'
// (one-time display right after enabling) -> back to 'idle'. Disabling is a
// separate small side-flow gated by 'disabling'.
export default function TwoFactorSection() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const showToast = useToast();
  const [step, setStep] = useState('idle');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleStartSetup() {
    setError(null);
    setBusy(true);
    try {
      const data = await setup2fa();
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
      setStep('setup');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start 2FA setup');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmSetup(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await enable2fa(code);
      setBackupCodes(data.backupCodes);
      setStep('backupCodes');
      dispatch(updateUser({ ...user, twoFactorEnabled: true }));
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid authentication code');
    } finally {
      setBusy(false);
    }
  }

  function handleDone() {
    setStep('idle');
    setCode('');
    setSecret(null);
    setQrCodeDataUrl(null);
    setBackupCodes(null);
  }

  async function handleDisable(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await disable2fa(password);
      dispatch(updateUser({ ...user, twoFactorEnabled: false }));
      setPassword('');
      setStep('idle');
      showToast('Two-factor authentication disabled', { type: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not disable 2FA');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'backupCodes') {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Two-factor authentication</h2>
        <p className={styles.success}>Two-factor authentication is now enabled.</p>
        <p className={styles.hint}>
          Save these backup codes somewhere safe — each can be used once to log in if you lose
          access to your authenticator app. They won't be shown again.
        </p>
        <ul className={styles.backupCodeList}>
          {backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button type="button" className={styles.submit} onClick={handleDone}>
          I've saved these codes
        </button>
      </section>
    );
  }

  if (step === 'setup') {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Two-factor authentication</h2>
        {error && <div className={styles.error}>{error}</div>}
        <p className={styles.hint}>
          Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password…),
          then enter the 6-digit code it shows to confirm.
        </p>
        {qrCodeDataUrl && <img className={styles.qrCode} src={qrCodeDataUrl} alt="2FA QR code" />}
        <p className={styles.hint}>Or enter this key manually: {secret}</p>
        <form className={styles.form} onSubmit={handleConfirmSetup}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="tfaCode">
              6-digit code
            </label>
            <input
              id="tfaCode"
              className={styles.input}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? 'Confirming…' : 'Confirm & enable'}
          </button>
        </form>
      </section>
    );
  }

  if (step === 'disabling') {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Two-factor authentication</h2>
        {error && <div className={styles.error}>{error}</div>}
        <form className={styles.form} onSubmit={handleDisable}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="disablePassword">
              Confirm your password to disable 2FA
            </label>
            <input
              id="disablePassword"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className={styles.actionsRow}>
            <button className={styles.dangerButton} type="submit" disabled={busy}>
              {busy ? 'Disabling…' : 'Disable 2FA'}
            </button>
            <button type="button" className={styles.cancelLink} onClick={() => setStep('idle')}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>Two-factor authentication</h2>
      {error && <div className={styles.error}>{error}</div>}
      {user?.twoFactorEnabled ? (
        <>
          <p className={styles.hint}>Two-factor authentication is enabled on your account.</p>
          <button type="button" className={styles.dangerButton} onClick={() => setStep('disabling')}>
            Disable 2FA
          </button>
        </>
      ) : (
        <>
          <p className={styles.hint}>
            Add an extra layer of security — after your password, you'll also need a code from an
            authenticator app to log in.
          </p>
          <button type="button" className={styles.submit} onClick={handleStartSetup} disabled={busy}>
            {busy ? 'Starting…' : 'Enable Two-Factor Authentication'}
          </button>
        </>
      )}
    </section>
  );
}
