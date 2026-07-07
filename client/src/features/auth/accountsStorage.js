// Non-sensitive display metadata only (id/username/avatarUrl/email) — never
// tokens. Tokens stay exactly where they always did: the access token in
// Redux memory only, the refresh token in an httpOnly cookie the client
// never touches directly. This is purely "which accounts has this browser
// seen before" so the switcher UI can render instantly and so restoreSession
// knows which account to silently re-authenticate on boot.
const ACCOUNTS_KEY = 'streambeat_accounts';
const ACTIVE_KEY = 'streambeat_active_account_id';

export function loadKnownAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveKnownAccounts(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // localStorage unavailable (private browsing, quota) — the switcher
    // just won't persist across reloads; not worth failing anything over.
  }
}

export function removeKnownAccount(accounts, userId) {
  return accounts.filter((a) => a.id !== userId);
}

export function loadActiveAccountId() {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveAccountId(userId) {
  try {
    if (userId) localStorage.setItem(ACTIVE_KEY, userId);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // see above
  }
}
