import { axiosClient } from '../../lib/axiosClient';

export async function fetchHelpArticles() {
  const { data } = await axiosClient.get('/help');
  return data.categories;
}

export async function createHelpArticle({ category, question, answer, order }) {
  const { data } = await axiosClient.post('/help', { category, question, answer, order });
  return data.article;
}

export async function updateHelpArticle(id, updates) {
  const { data } = await axiosClient.patch(`/help/${id}`, updates);
  return data.article;
}

export async function deleteHelpArticle(id) {
  await axiosClient.delete(`/help/${id}`);
}
