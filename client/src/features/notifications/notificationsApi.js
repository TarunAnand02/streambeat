import { axiosClient } from '../../lib/axiosClient';

export async function fetchNotifications(page = 1, type) {
  const { data } = await axiosClient.get('/notifications', { params: { page, type } });
  return data;
}

export async function markNotificationRead(id) {
  await axiosClient.post(`/notifications/${id}/read`);
}

export async function markNotificationsReadBulk(ids) {
  await axiosClient.post('/notifications/read-bulk', { ids });
}

export async function markAllNotificationsRead() {
  await axiosClient.post('/notifications/read-all');
}

export async function deleteNotifications(ids) {
  await axiosClient.delete('/notifications', { data: { ids } });
}

export async function restoreNotifications(ids) {
  await axiosClient.post('/notifications/restore', { ids });
}
