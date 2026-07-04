import { axiosClient } from '../../lib/axiosClient';

export async function updateProfile(updates) {
  const { data } = await axiosClient.patch('/users/me', updates);
  return data.user;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await axiosClient.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return data;
}

export async function setup2fa() {
  const { data } = await axiosClient.post('/auth/2fa/setup');
  return data;
}

export async function enable2fa(code) {
  const { data } = await axiosClient.post('/auth/2fa/enable', { code });
  return data;
}

export async function disable2fa(password) {
  await axiosClient.post('/auth/2fa/disable', { password });
}

export async function fetchSessions() {
  const { data } = await axiosClient.get('/auth/sessions');
  return data.sessions;
}

export async function revokeSession(id) {
  await axiosClient.delete(`/auth/sessions/${id}`);
}
