import { axiosClient } from '../../lib/axiosClient';

export async function fetchChannelAnalytics() {
  const { data } = await axiosClient.get('/analytics/channel');
  return data;
}

export async function fetchVideoAnalytics(videoId) {
  const { data } = await axiosClient.get(`/analytics/videos/${videoId}`);
  return data;
}
