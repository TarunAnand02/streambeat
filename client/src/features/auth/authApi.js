import { axiosClient } from '../../lib/axiosClient';

export async function forgotPassword(email) {
  const { data } = await axiosClient.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token, password) {
  await axiosClient.post('/auth/reset-password', { token, password });
}
