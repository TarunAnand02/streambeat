import { axiosClient } from '../../lib/axiosClient';

export async function fetchDashboard() {
  const { data } = await axiosClient.get('/admin/dashboard');
  return data;
}

export async function fetchAnalyticsOverview() {
  const { data } = await axiosClient.get('/admin/analytics');
  return data;
}

export async function fetchActivityLogs({ page = 1, action, actor } = {}) {
  const { data } = await axiosClient.get('/admin/activity-logs', { params: { page, action, actor } });
  return data;
}

export async function fetchUsers({ page = 1, q, status } = {}) {
  const { data } = await axiosClient.get('/admin/users', { params: { page, q, status } });
  return data;
}

export async function fetchUser(id) {
  const { data } = await axiosClient.get(`/admin/users/${id}`);
  return data;
}

export async function updateAdminUser(id, updates) {
  const { data } = await axiosClient.patch(`/admin/users/${id}`, updates);
  return data.user;
}

export async function suspendUser(id, reason) {
  const { data } = await axiosClient.post(`/admin/users/${id}/suspend`, { reason });
  return data.user;
}

export async function activateUser(id) {
  const { data } = await axiosClient.post(`/admin/users/${id}/activate`);
  return data.user;
}

export async function deleteAdminUser(id) {
  await axiosClient.delete(`/admin/users/${id}`);
}

export async function fetchAdminVideos({ page = 1, q, uploader, visibility, status, transcodeStatus } = {}) {
  const { data } = await axiosClient.get('/admin/videos', {
    params: { page, q, uploader, visibility, status, transcodeStatus },
  });
  return data;
}

export async function updateAdminVideo(id, updates) {
  const { data } = await axiosClient.patch(`/admin/videos/${id}`, updates);
  return data.video;
}

export async function deleteAdminVideo(id) {
  const { data } = await axiosClient.delete(`/admin/videos/${id}`);
  return data.video;
}

export async function restoreAdminVideo(id) {
  const { data } = await axiosClient.post(`/admin/videos/${id}/restore`);
  return data.video;
}

export async function reprocessAdminVideo(id) {
  await axiosClient.post(`/admin/videos/${id}/reprocess`);
}

export async function fetchUploadQueue() {
  const { data } = await axiosClient.get('/admin/uploads/queue');
  return data;
}

export async function retryUpload(id) {
  await axiosClient.post(`/admin/uploads/${id}/retry`);
}

export async function cancelStuckJob(id) {
  const { data } = await axiosClient.post(`/admin/uploads/${id}/cancel`);
  return data.video;
}

export async function fetchStorageOverview() {
  const { data } = await axiosClient.get('/admin/storage');
  return data;
}

export async function scanOrphanFiles() {
  const { data } = await axiosClient.get('/admin/storage/orphans');
  return data;
}

export async function cleanOrphanFiles() {
  const { data } = await axiosClient.post('/admin/storage/orphans/clean');
  return data;
}
