import { axiosClient } from '../../lib/axiosClient';

export async function fetchHistory() {
  const { data } = await axiosClient.get('/history');
  return data.videos;
}

export async function clearHistory() {
  await axiosClient.delete('/history');
}

export async function removeHistoryEntry(videoId) {
  await axiosClient.delete(`/history/${videoId}`);
}
