import { useEffect, useState } from 'react';
import { useToast } from '../../components/toast/ToastProvider';
import { fetchSettings, updateSettings } from './adminSettingsApi';
import shared from './AdminShared.module.css';

const ALL_FORMATS = ['video/mp4', 'video/webm', 'video/ogg'];
const QUALITIES = ['auto', '1080p', '720p', '480p', '360p'];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch(() => showToast('Could not load settings', { type: 'error' }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  function toggleFormat(format) {
    setSettings((s) => {
      const has = s.allowedVideoFormats.includes(format);
      const next = has
        ? s.allowedVideoFormats.filter((f) => f !== format)
        : [...s.allowedVideoFormats, format];
      return { ...s, allowedVideoFormats: next };
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (settings.allowedVideoFormats.length === 0) {
      showToast('At least one video format must be allowed', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const updated = await updateSettings({
        siteName: settings.siteName,
        logoUrl: settings.logoUrl || null,
        maxUploadSizeMB: settings.maxUploadSizeMB,
        allowedVideoFormats: settings.allowedVideoFormats,
        maxUploadsPerUser: settings.maxUploadsPerUser || null,
        defaultVideoQuality: settings.defaultVideoQuality,
        maintenanceMode: settings.maintenanceMode,
      });
      setSettings(updated);
      showToast('Settings saved');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save settings', { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <p>Loading…</p>;

  return (
    <div>
      <h1 className={shared.heading}>Settings</h1>

      <form className={shared.formGrid} onSubmit={handleSave}>
        <div className={shared.formRow}>
          <label htmlFor="siteName">Site Name</label>
          <input
            id="siteName"
            type="text"
            value={settings.siteName}
            onChange={(e) => set('siteName', e.target.value)}
            maxLength={60}
          />
        </div>

        <div className={shared.formRow}>
          <label htmlFor="logoUrl">Logo URL</label>
          <input
            id="logoUrl"
            type="text"
            placeholder="https://…"
            value={settings.logoUrl || ''}
            onChange={(e) => set('logoUrl', e.target.value)}
          />
        </div>

        <div className={shared.formRow}>
          <label htmlFor="maxUploadSizeMB">Maximum File Size (MB)</label>
          <input
            id="maxUploadSizeMB"
            type="number"
            min={1}
            max={500}
            value={settings.maxUploadSizeMB}
            onChange={(e) => set('maxUploadSizeMB', Number(e.target.value))}
          />
          <p className={shared.hint}>Capped at 500MB — the platform's own hard ceiling.</p>
        </div>

        <div className={shared.formRow}>
          <label>Allowed Video Formats</label>
          {ALL_FORMATS.map((format) => (
            <div key={format} className={shared.checkboxRow}>
              <input
                type="checkbox"
                id={format}
                checked={settings.allowedVideoFormats.includes(format)}
                onChange={() => toggleFormat(format)}
              />
              <label htmlFor={format}>{format}</label>
            </div>
          ))}
        </div>

        <div className={shared.formRow}>
          <div className={shared.checkboxRow}>
            <input
              type="checkbox"
              id="noUploadLimit"
              checked={!settings.maxUploadsPerUser}
              onChange={(e) => set('maxUploadsPerUser', e.target.checked ? null : 100)}
            />
            <label htmlFor="noUploadLimit">No limit on number of uploads per user</label>
          </div>
          {settings.maxUploadsPerUser != null && (
            <input
              type="number"
              min={1}
              value={settings.maxUploadsPerUser}
              onChange={(e) => set('maxUploadsPerUser', Number(e.target.value))}
            />
          )}
        </div>

        <div className={shared.formRow}>
          <label htmlFor="defaultVideoQuality">Default Video Quality</label>
          <select
            id="defaultVideoQuality"
            value={settings.defaultVideoQuality}
            onChange={(e) => set('defaultVideoQuality', e.target.value)}
          >
            {QUALITIES.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        <div className={shared.formRow}>
          <div className={shared.checkboxRow}>
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onChange={(e) => set('maintenanceMode', e.target.checked)}
            />
            <label htmlFor="maintenanceMode">Maintenance mode</label>
          </div>
          <p className={shared.hint}>Non-admins see a maintenance page instead of the app while this is on.</p>
        </div>

        <button type="submit" className={shared.actionButtonPrimary} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
