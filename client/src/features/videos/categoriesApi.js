import { axiosClient } from '../../lib/axiosClient';

export async function fetchCategories() {
  const { data } = await axiosClient.get('/categories');
  return data.categories;
}

export async function createCategory(label) {
  const { data } = await axiosClient.post('/categories', { label });
  return data.category;
}
