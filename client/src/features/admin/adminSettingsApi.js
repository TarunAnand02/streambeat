import { axiosClient } from '../../lib/axiosClient';

// No auth required — used on app boot before we know if anyone's logged in.
export async function fetchPublicSettings() {
  const { data } = await axiosClient.get('/settings/public');
  return data;
}

export async function fetchSettings() {
  const { data } = await axiosClient.get('/settings');
  return data.settings;
}

export async function updateSettings(updates) {
  const { data } = await axiosClient.patch('/settings', updates);
  return data.settings;
}
