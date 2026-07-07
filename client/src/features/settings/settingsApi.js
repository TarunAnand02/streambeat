import { axiosClient } from '../../lib/axiosClient';

export async function updateProfile(updates) {
  const { data } = await axiosClient.patch('/users/me', updates);
  return data.user;
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  const { data } = await axiosClient.put('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.user;
}

export async function deleteAvatar() {
  const { data } = await axiosClient.delete('/users/me/avatar');
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

export async function fetchStorageStats() {
  const { data } = await axiosClient.get('/users/me/storage');
  return data;
}

export async function exportUserData() {
  const response = await axiosClient.get('/users/me/export', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'streambeat-data-export.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
