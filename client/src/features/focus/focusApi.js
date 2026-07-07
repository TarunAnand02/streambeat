import { axiosClient } from '../../lib/axiosClient';

export async function postFocusSession({ goal, videoId, minutes }) {
  const { data } = await axiosClient.post('/focus-sessions', { goal, videoId, minutes });
  return data;
}

export async function fetchFocusStats() {
  const { data } = await axiosClient.get('/focus-sessions/stats');
  return data;
}
