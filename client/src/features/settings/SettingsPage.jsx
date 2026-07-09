import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, updateUser } from '../auth/authSlice';
import { cancelEmailChange, changeEmail } from '../auth/authApi';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/toast/ToastProvider';
import Avatar from '../../components/ui/Avatar';
import { changePassword, deleteAvatar, exportUserData, updateProfile, uploadAvatar } from './settingsApi';
import PasswordInput from '../../components/ui/PasswordInput';
import AppearanceSection from './AppearanceSection';
import SessionsSection from './SessionsSection';
import TwoFactorSection from './TwoFactorSection';
import styles from './SettingsPage.module.css';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export default function SettingsPage() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const showToast = useToast();
  const avatarInputRef = useRef(null);

  const [bio, setBio] = useState(user?.bio || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(null);
  const [emailError, setEmailError] = useState(null);
  const [emailCancelling, setEmailCancelling] = useState(false);

  const [exporting, setExporting] = useState(false);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    setProfileSaving(true);
    try {
      const updated = await updateProfile({ bio });
      dispatch(updateUser(updated));
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Could not save profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      showToast('Image exceeds the 5MB size limit', { type: 'error' });
      return;
    }
    setAvatarBusy(true);
    try {
      const updated = await uploadAvatar(file);
      dispatch(updateUser(updated));
      showToast('Profile photo updated', { type: 'success' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not upload photo', { type: 'error' });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarRemove() {
    setAvatarBusy(true);
    try {
      const updated = await deleteAvatar();
      dispatch(updateUser(updated));
      showToast('Profile photo removed', { type: 'success' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not remove photo', { type: 'error' });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleToggleAutoRemove() {
    const next = !user.autoRemoveCompletedFromContinueWatching;
    dispatch(updateUser({ ...user, autoRemoveCompletedFromContinueWatching: next }));
    try {
      await updateProfile({ autoRemoveCompletedFromContinueWatching: next });
    } catch {
      dispatch(updateUser({ ...user, autoRemoveCompletedFromContinueWatching: !next }));
      showToast('Could not update this setting', { type: 'error' });
    }
  }

  async function handleToggleAutoplay() {
    const next = !(user.autoplayEnabled ?? true);
    dispatch(updateUser({ ...user, autoplayEnabled: next }));
    try {
      await updateProfile({ autoplayEnabled: next });
    } catch {
      dispatch(updateUser({ ...user, autoplayEnabled: !next }));
      showToast('Could not update this setting', { type: 'error' });
    }
  }

  async function handleToggleNotificationPref(type) {
    const prevPrefs = user.notificationPrefs || {};
    const next = { ...prevPrefs, [type]: !(prevPrefs[type] ?? true) };
    dispatch(updateUser({ ...user, notificationPrefs: next }));
    try {
      await updateProfile({ notificationPrefs: { [type]: next[type] } });
    } catch {
      dispatch(updateUser({ ...user, notificationPrefs: prevPrefs }));
      showToast('Could not update this setting', { type: 'error' });
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setEmailError(null);
    setEmailSaved(null);
    setEmailSaving(true);
    try {
      await changeEmail(newEmail, emailPassword);
      dispatch(updateUser({ ...user, pendingEmail: newEmail }));
      setEmailSaved(`Confirmation link sent to ${newEmail}.`);
      setNewEmail('');
      setEmailPassword('');
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Could not change email');
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleCancelEmailChange() {
    setEmailCancelling(true);
    try {
      await cancelEmailChange();
      dispatch(updateUser({ ...user, pendingEmail: null }));
    } catch {
      showToast('Could not cancel the pending email change', { type: 'error' });
    } finally {
      setEmailCancelling(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportUserData();
    } catch {
      showToast('Could not export your data', { type: 'error' });
    } finally {
      setExporting(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setPasswordSaving(true);
    try {
      const { user: updatedUser, accessToken } = await changePassword({ currentPassword, newPassword });
      dispatch(setCredentials({ user: updatedUser, accessToken }));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Could not change password');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>

      <AppearanceSection />

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Profile</h2>
        <div className={styles.avatarRow}>
          <Avatar username={user?.username} avatarUrl={user?.avatarUrl} size={64} />
          <div className={styles.avatarActions}>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={avatarBusy}
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarBusy ? 'Working…' : 'Upload photo'}
            </button>
            {user?.avatarUrl && (
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={avatarBusy}
                onClick={handleAvatarRemove}
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <form className={styles.form} onSubmit={handleProfileSubmit}>
          {profileError && <div className={styles.error}>{profileError}</div>}
          {profileSaved && <div className={styles.success}>Profile updated.</div>}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              className={styles.textarea}
              maxLength={300}
              rows={3}
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setProfileSaved(false);
              }}
              placeholder="Tell people a bit about yourself…"
            />
          </div>
          <button className={styles.submit} type="submit" disabled={profileSaving}>
            {profileSaving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Password</h2>
        {user?.hasPassword ? (
          <form className={styles.form} onSubmit={handlePasswordSubmit}>
            {passwordError && <div className={styles.error}>{passwordError}</div>}
            {passwordSaved && <div className={styles.success}>Password changed.</div>}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="currentPassword">
                Current password
              </label>
              <PasswordInput
                id="currentPassword"
                className={styles.input}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="newPassword">
                New password
              </label>
              <PasswordInput
                id="newPassword"
                className={styles.input}
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">
                Confirm new password
              </label>
              <PasswordInput
                id="confirmPassword"
                className={styles.input}
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button className={styles.submit} type="submit" disabled={passwordSaving}>
              {passwordSaving ? 'Changing…' : 'Change password'}
            </button>
          </form>
        ) : (
          <p className={styles.hint}>
            This account signs in with Google/GitHub and has no password set. Use "Forgot
            password?" on the login page if you'd like to set one.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Email address</h2>
        <p className={styles.hint}>Current: {user?.email}</p>
        {user?.pendingEmail && (
          <div className={styles.success}>
            Confirmation sent to {user.pendingEmail} — click the link there to finish the change.{' '}
            <button
              type="button"
              className={styles.linkButton}
              disabled={emailCancelling}
              onClick={handleCancelEmailChange}
            >
              Cancel
            </button>
          </div>
        )}
        <form className={styles.form} onSubmit={handleEmailSubmit}>
          {emailError && <div className={styles.error}>{emailError}</div>}
          {emailSaved && <div className={styles.success}>{emailSaved}</div>}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="newEmail">
              New email address
            </label>
            <input
              id="newEmail"
              type="email"
              className={styles.input}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              // Chrome treats an email input immediately followed by a
              // password field as a login form and autofills both from a
              // saved credential (including silently overwriting this with
              // the account's *current* email) unless explicitly told not
              // to — off here, and new-password below, break that pairing.
              autoComplete="off"
              required
            />
          </div>
          {user?.hasPassword && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="emailPassword">
                Current password
              </label>
              <PasswordInput
                id="emailPassword"
                className={styles.input}
                // Deliberately not "current-password" — that value is
                // exactly what invites Chrome to auto-fill this field (and
                // pair it with the email input above) from a saved login.
                // This is a re-entry confirmation, not a login, so the
                // field should always start empty.
                autoComplete="new-password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                required
              />
            </div>
          )}
          <button className={styles.submit} type="submit" disabled={emailSaving}>
            {emailSaving ? 'Sending…' : 'Change email'}
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Playback</h2>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={user?.autoRemoveCompletedFromContinueWatching ?? true}
            onChange={handleToggleAutoRemove}
          />
          <span>
            <span className={styles.checkboxLabel}>
              Remove videos from Continue Watching once finished
            </span>
            <p className={styles.checkboxHint}>
              Turn off to keep finished videos there until you remove them yourself.
            </p>
          </span>
        </label>
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={user?.autoplayEnabled ?? true} onChange={handleToggleAutoplay} />
          <span>
            <span className={styles.checkboxLabel}>Autoplay next video</span>
            <p className={styles.checkboxHint}>
              When a video ends outside a playlist, automatically play a recommended one next.
            </p>
          </span>
        </label>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Notifications</h2>
        <p className={styles.hint}>Choose which activity notifies you.</p>
        {[
          { type: 'subscribe', label: 'New subscribers' },
          { type: 'comment', label: 'Comments on your videos' },
          { type: 'reply', label: 'Replies to your comments' },
          { type: 'like', label: 'Likes on your videos' },
          { type: 'collection_add', label: 'Added to a shared collection' },
          { type: 'achievement', label: 'Achievements unlocked' },
          { type: 'transcode_complete', label: 'Upload processing finished' },
        ].map(({ type, label }) => (
          <label key={type} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={user?.notificationPrefs?.[type] ?? true}
              onChange={() => handleToggleNotificationPref(type)}
            />
            <span className={styles.checkboxLabel}>{label}</span>
          </label>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Your data</h2>
        <p className={styles.hint}>
          Download a copy of your profile, videos, collections, comments, subscriptions, and
          watch history as a JSON file.
        </p>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={exporting}
          onClick={handleExport}
        >
          {exporting ? 'Preparing…' : 'Download my data'}
        </button>
      </section>

      <TwoFactorSection />
      <SessionsSection />
    </div>
  );
}
