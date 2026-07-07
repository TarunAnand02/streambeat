import { axiosClient } from '../../lib/axiosClient';

export async function fetchLearningStats() {
  const { data } = await axiosClient.get('/history/learning-stats');
  return data;
}
