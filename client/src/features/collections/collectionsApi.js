import { axiosClient } from '../../lib/axiosClient';

export async function fetchCollections() {
  const { data } = await axiosClient.get('/collections');
  return data.collections;
}

export async function fetchCollection(id) {
  const { data } = await axiosClient.get(`/collections/${id}`);
  return data;
}

export async function createCollection({ name, description }) {
  const { data } = await axiosClient.post('/collections', { name, description });
  return data.collection;
}

export async function updateCollection(id, updates) {
  const { data } = await axiosClient.patch(`/collections/${id}`, updates);
  return data.collection;
}

export async function deleteCollection(id) {
  await axiosClient.delete(`/collections/${id}`);
}

export async function addCollaborator(id, { username, role }) {
  const { data } = await axiosClient.post(`/collections/${id}/collaborators`, { username, role });
  return data.collection;
}

export async function removeCollaborator(id, userId) {
  await axiosClient.delete(`/collections/${id}/collaborators/${userId}`);
}
