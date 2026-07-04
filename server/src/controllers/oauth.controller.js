import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as oauth from '../utils/oauth.js';
import { issueSession } from './auth.controller.js';

// Lets the frontend know which providers are actually configured, so it can
// simply not render a button for one that isn't — rather than presenting a
// sign-in flow that would just fail.
export const oauthConfig = asyncHandler(async (req, res) => {
  res.json({
    google: Boolean(env.oauth.google.clientId && env.oauth.google.clientSecret),
    github: Boolean(env.oauth.github.clientId && env.oauth.github.clientSecret),
  });
});

// Derives a valid, unique username from an OAuth display name/email — the
// provider doesn't give us anything that already matches our username rules
// (3-30 chars, letters/digits/underscore only, unique).
async function generateUsernameFrom(base) {
  let candidate = (base || 'user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  if (candidate.length < 3) candidate = candidate.padEnd(3, '0');

  let username = candidate;
  let suffix = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await User.exists({ username })) {
    suffix += 1;
    username = `${candidate}${suffix}`.slice(0, 30);
  }
  return username;
}

async function findOrCreateOAuthUser({ providerField, providerId, email, name, emailVerified }) {
  if (!email) throw new ApiError(400, 'That account has no email address to sign in with');
  const normalizedEmail = email.toLowerCase();

  let user = await User.findOne({ $or: [{ [providerField]: providerId }, { email: normalizedEmail }] });
  if (user) {
    if (!user[providerField]) {
      user[providerField] = providerId;
      await user.save();
    }
    return user;
  }

  const username = await generateUsernameFrom(name || normalizedEmail.split('@')[0]);
  return User.create({
    username,
    email: normalizedEmail,
    [providerField]: providerId,
    emailVerified: Boolean(emailVerified),
  });
}

export const googleLogin = asyncHandler(async (req, res) => {
  if (!env.oauth.google.clientId) throw new ApiError(400, 'Google sign-in is not configured');
  res.redirect(oauth.getGoogleAuthUrl());
});

export const googleCallback = asyncHandler(async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect(`${env.clientOrigin}/login?oauthError=1`);

  try {
    const providerToken = await oauth.exchangeGoogleCode(code);
    const profile = await oauth.fetchGoogleProfile(providerToken);
    const user = await findOrCreateOAuthUser({
      providerField: 'googleId',
      providerId: profile.id,
      email: profile.email,
      name: profile.name,
      emailVerified: profile.emailVerified,
    });

    const accessToken = await issueSession(req, res, user);
    res.redirect(`${env.clientOrigin}/oauth-callback#token=${accessToken}`);
  } catch {
    res.redirect(`${env.clientOrigin}/login?oauthError=1`);
  }
});

export const githubLogin = asyncHandler(async (req, res) => {
  if (!env.oauth.github.clientId) throw new ApiError(400, 'GitHub sign-in is not configured');
  res.redirect(oauth.getGithubAuthUrl());
});

export const githubCallback = asyncHandler(async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect(`${env.clientOrigin}/login?oauthError=1`);

  try {
    const providerToken = await oauth.exchangeGithubCode(code);
    const profile = await oauth.fetchGithubProfile(providerToken);
    const user = await findOrCreateOAuthUser({
      providerField: 'githubId',
      providerId: profile.id,
      email: profile.email,
      name: profile.name,
      emailVerified: profile.emailVerified,
    });

    const accessToken = await issueSession(req, res, user);
    res.redirect(`${env.clientOrigin}/oauth-callback#token=${accessToken}`);
  } catch {
    res.redirect(`${env.clientOrigin}/login?oauthError=1`);
  }
});
