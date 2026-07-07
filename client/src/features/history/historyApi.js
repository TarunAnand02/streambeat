import { axiosClient } from '../../lib/axiosClient';

export async function fetchHistory() {
  const { data } = await axiosClient.get('/history');
  return data.videos;
}

export async function fetchContinueWatching() {
  const { data } = await axiosClient.get('/history/continue-watching');
  return data.videos;
}

export async function fetchWeeklySummary() {
  const { data } = await axiosClient.get('/history/weekly-summary');
  return data;
}

export async function clearHistory() {
  await axiosClient.delete('/history');
}

export async function removeHistoryEntry(videoId) {
  await axiosClient.delete(`/history/${videoId}`);
}
