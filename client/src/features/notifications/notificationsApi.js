import { axiosClient } from '../../lib/axiosClient';

export async function fetchNotifications(page = 1) {
  const { data } = await axiosClient.get('/notifications', { params: { page } });
  return data;
}

export async function markNotificationRead(id) {
  await axiosClient.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await axiosClient.post('/notifications/read-all');
}
