import { env } from '../config/env.js';

const GOOGLE_REDIRECT_URI = () => `${env.serverOrigin}/api/auth/google/callback`;
const GITHUB_REDIRECT_URI = () => `${env.serverOrigin}/api/auth/github/callback`;

export function getGoogleAuthUrl() {
  const params = new URLSearchParams({
    client_id: env.oauth.google.clientId,
    redirect_uri: GOOGLE_REDIRECT_URI(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.oauth.google.clientId,
      client_secret: env.oauth.google.clientSecret,
      redirect_uri: GOOGLE_REDIRECT_URI(),
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Google token exchange failed');
  return data.access_token;
}

export async function fetchGoogleProfile(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Could not fetch Google profile');
  const data = await res.json();
  return { id: data.sub, email: data.email, name: data.name, emailVerified: Boolean(data.email_verified) };
}

export function getGithubAuthUrl() {
  const params = new URLSearchParams({
    client_id: env.oauth.github.clientId,
    redirect_uri: GITHUB_REDIRECT_URI(),
    scope: 'read:user user:email',
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeGithubCode(code) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      code,
      client_id: env.oauth.github.clientId,
      client_secret: env.oauth.github.clientSecret,
      redirect_uri: GITHUB_REDIRECT_URI(),
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || 'GitHub token exchange failed');
  return data.access_token;
}

export async function fetchGithubProfile(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'StreamBeat' };
  const userRes = await fetch('https://api.github.com/user', { headers });
  if (!userRes.ok) throw new Error('Could not fetch GitHub profile');
  const user = await userRes.json();

  let email = user.email;
  let emailVerified = false;
  // GitHub only includes a public email in /user if the account has one set
  // as public — otherwise (and to know if it's actually verified) it has to
  // be looked up separately, still requires the user:email scope.
  const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
  if (emailsRes.ok) {
    const emails = await emailsRes.json();
    const primary = Array.isArray(emails) ? emails.find((e) => e.primary) || emails[0] : null;
    if (primary) {
      email = email || primary.email;
      emailVerified = Boolean(primary.verified);
    }
  }

  return { id: String(user.id), email, name: user.name || user.login, emailVerified };
}
