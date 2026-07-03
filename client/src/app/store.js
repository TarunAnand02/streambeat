import { configureStore } from '@reduxjs/toolkit';
import { clearCredentials, setCredentials } from '../features/auth/authSlice';
import authReducer from '../features/auth/authSlice';
import { attachAuthInterceptor } from '../lib/axiosClient';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

attachAuthInterceptor({
  getToken: () => store.getState().auth.accessToken,
  refreshed: (data) => store.dispatch(setCredentials(data)),
  refreshFailed: () => store.dispatch(clearCredentials()),
});
