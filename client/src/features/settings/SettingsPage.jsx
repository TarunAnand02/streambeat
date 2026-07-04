import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, updateUser } from '../auth/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { changePassword, updateProfile } from './settingsApi';
import AppearanceSection from './AppearanceSection';
import SessionsSection from './SessionsSection';
import TwoFactorSection from './TwoFactorSection';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    setProfileSaving(true);
    try {
      const updated = await updateProfile({ bio, avatarUrl });
      dispatch(updateUser(updated));
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Could not save profile');
    } finally {
      setProfileSaving(false);
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
          <div className={styles.field}>
            <label className={styles.label} htmlFor="avatarUrl">
              Avatar URL
            </label>
            <input
              id="avatarUrl"
              className={styles.input}
              type="url"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setProfileSaved(false);
              }}
              placeholder="https://…"
            />
          </div>
          <button className={styles.submit} type="submit" disabled={profileSaving}>
            {profileSaving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Password</h2>
        <form className={styles.form} onSubmit={handlePasswordSubmit}>
          {passwordError && <div className={styles.error}>{passwordError}</div>}
          {passwordSaved && <div className={styles.success}>Password changed.</div>}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="currentPassword">
              Current password
            </label>
            <input
              id="currentPassword"
              className={styles.input}
              type="password"
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
            <input
              id="newPassword"
              className={styles.input}
              type="password"
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
            <input
              id="confirmPassword"
              className={styles.input}
              type="password"
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
      </section>

      <TwoFactorSection />
      <SessionsSection />
    </div>
  );
}
