import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const axiosClient = axios.create({
  baseURL,
  withCredentials: true, // send the httpOnly refresh cookie
});

// Set by the store once it's created, so the interceptor below can read the
// current access token and dispatch on refresh failure without a circular
// import between this module and the auth slice.
let getAccessToken = () => null;
let onRefreshed = () => {};
let onRefreshFailed = () => {};

export function attachAuthInterceptor({ getToken, refreshed, refreshFailed }) {
  getAccessToken = getToken;
  onRefreshed = refreshed;
  onRefreshFailed = refreshFailed;
}

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config._retried || config.url?.includes('/auth/')) {
      return Promise.reject(error);
    }
    config._retried = true;

    try {
      refreshPromise =
        refreshPromise ||
        axiosClient.post('/auth/refresh').finally(() => {
          refreshPromise = null;
        });
      const { data } = await refreshPromise;
      onRefreshed(data);
      config.headers.Authorization = `Bearer ${data.accessToken}`;
      return axiosClient(config);
    } catch (refreshError) {
      onRefreshFailed();
      return Promise.reject(refreshError);
    }
  }
);
