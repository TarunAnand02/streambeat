import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { axiosClient } from '../../lib/axiosClient';

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ username, email, password }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post('/auth/register', {
        username,
        email,
        password,
      });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post('/auth/login', { email, password });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

// Second step of login when the account has 2FA enabled — loginUser above
// returns { requires2FA: true, tempToken } instead of real tokens in that
// case, and this thunk exchanges a TOTP/backup code for the real session.
export const verifyTwoFactorLogin = createAsyncThunk(
  'auth/verifyTwoFactorLogin',
  async ({ tempToken, code }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post('/auth/2fa/verify-login', { tempToken, code });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Invalid authentication code');
    }
  }
);

// Attempts to silently re-establish a session from the httpOnly refresh
// cookie on app boot (e.g. after a page reload). Failure is expected/normal
// when the user was never logged in, so it does not surface as an error.
export const restoreSession = createAsyncThunk('auth/restore', async () => {
  const { data } = await axiosClient.post('/auth/refresh');
  return data;
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await axiosClient.post('/auth/logout');
});

const initialState = {
  user: null,
  accessToken: null,
  status: 'idle', // idle | loading | succeeded | failed
  initialized: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
    },
    // Updates the profile fields on the already-logged-in user without
    // touching the access token — for use after a profile edit, where no new
    // token is issued (unlike login/change-password).
    updateUser(state, action) {
      state.user = action.payload;
    },
    clearCredentials(state) {
      state.user = null;
      state.accessToken = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // A 2FA-enabled account gets { requires2FA, tempToken } here instead
        // of real tokens — leave user/accessToken untouched until the
        // second step (verifyTwoFactorLogin) actually completes.
        if (!action.payload.requires2FA) {
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(verifyTwoFactorLogin.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifyTwoFactorLogin.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(verifyTwoFactorLogin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.initialized = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.initialized = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
      });
  },
});

export const { setCredentials, clearCredentials, updateUser } = authSlice.actions;
export default authSlice.reducer;
