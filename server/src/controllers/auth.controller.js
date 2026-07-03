import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isMailerConfigured, sendPasswordResetEmail } from '../utils/mailer.js';
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';

const SALT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function toPublicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isAdmin: user.isAdmin,
  };
}

export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    throw new ApiError(409, 'Username or email already in use');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ username, email, passwordHash });

  res.status(201).json({ user: toPublicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(
    user._id.toString(),
    user.refreshTokenVersion
  );

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.json({ user: toPublicUser(user), accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    throw new ApiError(401, 'No refresh token provided');
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.refreshTokenVersion !== payload.ver) {
    throw new ApiError(401, 'Refresh token has been revoked');
  }

  const accessToken = signAccessToken(user._id.toString());
  const newRefreshToken = signRefreshToken(
    user._id.toString(),
    user.refreshTokenVersion
  );

  res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions);
  res.json({ user: toPublicUser(user), accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });
  res.status(204).send();
});

export const logoutAll = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.userId, { $inc: { refreshTokenVersion: 1 } });
  res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });
  res.status(204).send();
});

// Always responds with the same generic message regardless of whether the
// email is registered, so this endpoint can't be used to enumerate accounts.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const genericMessage = { message: 'If that email is registered, a reset link has been sent.' };

  // eslint-disable-next-line no-console
  console.log(`[forgot-password] request body email: "${email}"`);

  const user = await User.findOne({ email });
  // eslint-disable-next-line no-console
  console.log(`[forgot-password] DB lookup result: ${user ? `found user "${user.username}" <${user.email}>` : 'no matching account'}`);

  if (!user) {
    return res.json(genericMessage);
  }

  const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
  user.resetPasswordTokenHash = hashResetToken(rawToken);
  user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const resetUrl = `${env.clientOrigin}/reset-password?token=${rawToken}`;
  // eslint-disable-next-line no-console
  console.log(`[forgot-password] sending — from: "${env.smtp.from}" to: "${user.email}"`);
  const sent = isMailerConfigured() ? await sendPasswordResetEmail(user.email, resetUrl) : false;

  if (!sent) {
    // No SMTP configured (or send failed) — log it so the feature is still
    // usable in local/dev without setting up email, and surface the link
    // directly in the response outside production so it's actually usable.
    // eslint-disable-next-line no-console
    console.log(`[password reset] ${user.email} -> ${resetUrl}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[forgot-password] sendMail() completed without error for recipient "${user.email}"`);
  }

  res.json({ ...genericMessage, ...(env.isProd || sent ? {} : { devResetUrl: resetUrl }) });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const tokenHash = hashResetToken(token);

  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new ApiError(400, 'That reset link is invalid or has expired');
  }

  user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpires = null;
  user.refreshTokenVersion += 1; // invalidate any existing sessions
  await user.save();

  res.status(204).send();
});
