import { axiosClient } from '../../lib/axiosClient';

export async function fetchChannel(userId) {
  const { data } = await axiosClient.get(`/users/${userId}/channel`);
  return data;
}

export async function updateProfile(updates) {
  const { data } = await axiosClient.patch('/users/me', updates);
  return data.user;
}
