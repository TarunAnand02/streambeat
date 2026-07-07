import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { axiosClient } from '../../lib/axiosClient';
import {
  loadActiveAccountId,
  loadKnownAccounts,
  removeKnownAccount,
  saveActiveAccountId,
  saveKnownAccounts,
} from './accountsStorage';

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
// returns { requires2FA, tempToken } instead of real tokens in that case,
// and this thunk exchanges a TOTP/backup code for the real session.
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

// Attempts to silently re-establish the last-active account's session from
// its httpOnly refresh cookie on app boot (e.g. after a page reload).
// Failure is expected/normal when nobody was ever logged in on this browser,
// so it does not surface as an error.
export const restoreSession = createAsyncThunk('auth/restore', async (_, { rejectWithValue }) => {
  const activeId = loadActiveAccountId();
  if (!activeId) return rejectWithValue({ userId: null });
  try {
    const { data } = await axiosClient.post('/auth/refresh', { userId: activeId });
    return data;
  } catch (err) {
    return rejectWithValue({ userId: activeId, message: err.response?.data?.message });
  }
});

// The account switcher's core action — re-authenticates a *different*
// already-known account using its own still-valid refresh cookie, with no
// password needed, the same way restoreSession does for the active one.
export const switchAccount = createAsyncThunk(
  'auth/switchAccount',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post('/auth/refresh', { userId });
      return data;
    } catch (err) {
      return rejectWithValue({ userId, message: err.response?.data?.message });
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async (_, { getState }) => {
  const userId = getState().auth.user?.id;
  if (userId) await axiosClient.post('/auth/logout', { userId });
  return userId;
});

function accountSummary(user) {
  return { id: user.id, username: user.username, avatarUrl: user.avatarUrl, email: user.email };
}

// Shared by every place that lands on a valid, real session for some
// account (login, 2FA verify, restoreSession, switchAccount, and the
// setCredentials reducer used by the OAuth callback / silent 401-refresh /
// post-change-password reissue) — keeps "who's currently active" and "which
// accounts does this browser know about" from ever drifting out of sync.
function applyActiveAccount(state, { user, accessToken }) {
  state.user = user;
  state.accessToken = accessToken;
  const idx = state.accounts.findIndex((a) => a.id === user.id);
  const summary = accountSummary(user);
  if (idx === -1) state.accounts.push(summary);
  else state.accounts[idx] = summary;
  saveKnownAccounts(state.accounts);
  saveActiveAccountId(user.id);
}

const initialState = {
  user: null,
  accessToken: null,
  status: 'idle', // idle | loading | succeeded | failed
  initialized: false,
  error: null,
  accounts: loadKnownAccounts(), // [{id, username, avatarUrl, email}], includes the active one
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      // OAuthCallbackPage dispatches a { user: null, accessToken } placeholder
      // first, purely so the axios interceptor has a token to attach while
      // fetchMe() resolves the real user — nothing to record as an account yet.
      if (!action.payload.user) {
        state.accessToken = action.payload.accessToken;
        return;
      }
      applyActiveAccount(state, action.payload);
    },
    // Updates the profile fields on the already-logged-in user without
    // touching the access token — for use after a profile edit, where no new
    // token is issued (unlike login/change-password).
    updateUser(state, action) {
      state.user = action.payload;
      const idx = state.accounts.findIndex((a) => a.id === action.payload.id);
      if (idx !== -1) {
        state.accounts[idx] = accountSummary(action.payload);
        saveKnownAccounts(state.accounts);
      }
    },
    clearCredentials(state) {
      if (state.user) {
        state.accounts = removeKnownAccount(state.accounts, state.user.id);
        saveKnownAccounts(state.accounts);
      }
      state.user = null;
      state.accessToken = null;
      saveActiveAccountId(null);
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
        // of real tokens — leave the account list untouched until the second
        // step (verifyTwoFactorLogin) actually completes.
        if (!action.payload.requires2FA) {
          applyActiveAccount(state, action.payload);
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
        applyActiveAccount(state, action.payload);
      })
      .addCase(verifyTwoFactorLogin.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        applyActiveAccount(state, action.payload);
        state.initialized = true;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        // A real 401 (revoked/expired) means that account's session is truly
        // dead — drop it from the known list. No active-id at all just
        // means nobody was ever logged in on this browser; nothing to remove.
        const { userId } = action.payload || {};
        if (userId) {
          state.accounts = removeKnownAccount(state.accounts, userId);
          saveKnownAccounts(state.accounts);
        }
        state.user = null;
        state.accessToken = null;
        state.initialized = true;
      })
      .addCase(switchAccount.fulfilled, (state, action) => {
        applyActiveAccount(state, action.payload);
      })
      .addCase(switchAccount.rejected, (state, action) => {
        // That account's session died (revoked/expired elsewhere) — drop it
        // from the switcher list rather than leaving a dead entry that will
        // just fail again next time. The currently active account (if any)
        // is untouched.
        const { userId } = action.payload || {};
        if (userId) {
          state.accounts = removeKnownAccount(state.accounts, userId);
          saveKnownAccounts(state.accounts);
        }
      })
      .addCase(logoutUser.fulfilled, (state, action) => {
        const userId = action.payload;
        if (userId) {
          state.accounts = removeKnownAccount(state.accounts, userId);
          saveKnownAccounts(state.accounts);
        }
        state.user = null;
        state.accessToken = null;
        saveActiveAccountId(null);
      });
  },
});

export const { setCredentials, clearCredentials, updateUser } = authSlice.actions;
export default authSlice.reducer;
