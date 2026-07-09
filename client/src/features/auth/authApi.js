import { axiosClient } from '../../lib/axiosClient';
import { API_BASE_URL as baseURL } from '../../lib/apiBaseUrl';

export async function fetchOAuthConfig() {
  const { data } = await axiosClient.get('/auth/oauth-config');
  return data;
}

export function googleLoginUrl() {
  return `${baseURL}/auth/google`;
}

export function githubLoginUrl() {
  return `${baseURL}/auth/github`;
}

export async function fetchMe() {
  const { data } = await axiosClient.get('/users/me');
  return data.user;
}

export async function forgotPassword(email) {
  const { data } = await axiosClient.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token, password) {
  await axiosClient.post('/auth/reset-password', { token, password });
}

export async function verifyEmail(token) {
  await axiosClient.post('/auth/verify-email', { token });
}

export async function resendVerification() {
  const { data } = await axiosClient.post('/auth/resend-verification');
  return data;
}

export async function changeEmail(newEmail, password) {
  const { data } = await axiosClient.post('/auth/change-email', { newEmail, password });
  return data;
}

export async function confirmEmailChange(token) {
  const { data } = await axiosClient.post('/auth/confirm-email-change', { token });
  return data.user;
}

export async function cancelEmailChange() {
  await axiosClient.post('/auth/cancel-email-change');
}
