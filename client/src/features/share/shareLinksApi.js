import { axiosClient } from '../../lib/axiosClient';

export async function createShareLink(videoId, { password, expiresInHours } = {}) {
  const { data } = await axiosClient.post('/share-links', { videoId, password, expiresInHours });
  return data;
}

export async function fetchShareLinks(videoId) {
  const { data } = await axiosClient.get(`/share-links/video/${videoId}`);
  return data.links;
}

export async function revokeShareLink(id) {
  await axiosClient.delete(`/share-links/${id}`);
}

export async function accessShareLink(token, password) {
  const { data } = await axiosClient.post(`/share-links/${token}/access`, { password });
  return data;
}
