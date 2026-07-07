import { axiosClient } from '../../lib/axiosClient';

export async function fetchAchievements() {
  const { data } = await axiosClient.get('/achievements');
  return data.achievements;
}
