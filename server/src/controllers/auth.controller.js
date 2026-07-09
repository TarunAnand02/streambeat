import bcrypt from 'bcrypt';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  isMailerConfigured,
  sendEmailChangeAlert,
  sendEmailChangeConfirmation,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../utils/mailer.js';
import {
  refreshCookieName,
  refreshCookieOptions,
  sign2faPendingToken,
  signAccessToken,
  signRefreshToken,
  verify2faPendingToken,
  verifyRefreshToken,
} from '../utils/tokens.js';
import {
  generateBackupCodes,
  generateOtpAuthUrl,
  generateSecret,
  hashBackupCode,
  verifyTotp,
} from '../utils/twoFactor.js';

const SALT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const VERIFY_TOKEN_BYTES = 32;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// Issues a fresh access+refresh token pair, records a Session row for the
// new refresh token's jti (so it shows up in Settings > Sessions), and sets
// the refresh cookie. Shared by every place that establishes a session
// (login, 2FA verify, change-password).
export async function issueSession(req, res, user) {
  if (user.suspended) {
    throw new ApiError(403, 'This account has been suspended');
  }

  const jti = crypto.randomUUID();
  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString(), user.refreshTokenVersion, jti);

  await Session.create({
    user: user._id,
    jti,
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || '',
  });
  User.updateOne({ _id: user._id }, { lastLoginAt: new Date() }).catch(() => {});

  res.cookie(refreshCookieName(user._id), refreshToken, refreshCookieOptions);
  return accessToken;
}

export function toPublicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    // Google/GitHub-only accounts never set a local password — the client
    // uses this to skip asking for one on password-gated settings actions.
    hasPassword: Boolean(user.passwordHash),
    studyModeEnabled: user.studyModeEnabled,
    focusStats: user.focusStats,
    weeklyGoalMinutes: user.weeklyGoalMinutes,
    autoRemoveCompletedFromContinueWatching: user.autoRemoveCompletedFromContinueWatching,
    autoplayEnabled: user.autoplayEnabled,
    notificationPrefs: user.notificationPrefs,
    pendingEmail: user.pendingEmail,
  };
}

// Generates + saves the token (fast, must complete before the HTTP response
// so the link is valid the instant it's returned), but does NOT wait on the
// actual SMTP send — a real round-trip to Gmail can take several seconds,
// and callers (register, resend-verification) shouldn't block on that.
async function sendVerificationFor(user) {
  const rawToken = crypto.randomBytes(VERIFY_TOKEN_BYTES).toString('hex');
  user.emailVerifyTokenHash = hashResetToken(rawToken);
  user.emailVerifyExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
  await user.save();

  const verifyUrl = `${env.clientOrigin}/verify-email?token=${rawToken}`;
  if (isMailerConfigured()) {
    sendVerificationEmail(user.email, verifyUrl).catch((err) => {
      // Never log the raw link in production — it's a working
      // account-verification URL for this user.
      // eslint-disable-next-line no-console
      console.log(
        `[verify-email] send failed for "${user.email}": ${err.message}` +
          (env.isProd ? '' : ` — link: ${verifyUrl}`)
      );
    });
  } else if (!env.isProd) {
    // eslint-disable-next-line no-console
    console.log(`[verify-email] ${user.email} -> ${verifyUrl}`);
  }
  return { verifyUrl };
}

export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    throw new ApiError(409, 'Username or email already in use');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ username, email, passwordHash });

  const { verifyUrl } = await sendVerificationFor(user);

  res.status(201).json({
    user: toPublicUser(user),
    ...(env.isProd ? {} : { devVerifyUrl: verifyUrl }),
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const tokenHash = hashResetToken(token);

  const user = await User.findOne({
    emailVerifyTokenHash: tokenHash,
    emailVerifyExpires: { $gt: new Date() },
  });
  if (!user) {
    throw new ApiError(400, 'That verification link is invalid or has expired');
  }

  user.emailVerified = true;
  user.emailVerifyTokenHash = null;
  user.emailVerifyExpires = null;
  await user.save();

  res.status(204).send();
});

export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.emailVerified) {
    throw new ApiError(400, 'Your email is already verified');
  }

  const { verifyUrl } = await sendVerificationFor(user);
  res.json({
    message: 'Verification email sent.',
    ...(env.isProd ? {} : { devVerifyUrl: verifyUrl }),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  // No passwordHash means the account was created via Google/GitHub and
  // never set a local password — bcrypt.compare would throw on a
  // non-string hash, so this must be checked before calling it.
  if (!user || !user.passwordHash) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.twoFactorEnabled) {
    // Password alone is confirmed correct, but no session is issued yet —
    // the client must call /2fa/verify-login with this token plus a TOTP or
    // backup code before it gets real tokens.
    return res.json({ requires2FA: true, tempToken: sign2faPendingToken(user._id.toString()) });
  }

  const accessToken = await issueSession(req, res, user);
  res.json({ user: toPublicUser(user), accessToken });
});

export const verifyLogin2fa = asyncHandler(async (req, res) => {
  const { tempToken, code } = req.body;

  let payload;
  try {
    payload = verify2faPendingToken(tempToken);
  } catch {
    throw new ApiError(401, 'That login attempt has expired — please log in again');
  }

  const user = await User.findById(payload.sub).select(
    '+twoFactorSecret +twoFactorBackupCodeHashes +passwordHash'
  );
  if (!user || !user.twoFactorEnabled) {
    throw new ApiError(401, 'That login attempt has expired — please log in again');
  }

  const normalizedCode = code.trim();
  let usedBackupCode = false;

  let valid = await verifyTotp(normalizedCode, user.twoFactorSecret);
  if (!valid) {
    const codeHash = hashBackupCode(normalizedCode);
    const index = user.twoFactorBackupCodeHashes.indexOf(codeHash);
    if (index !== -1) {
      valid = true;
      usedBackupCode = true;
      user.twoFactorBackupCodeHashes.splice(index, 1);
    }
  }

  if (!valid) {
    throw new ApiError(401, 'Invalid authentication code');
  }

  if (usedBackupCode) await user.save();

  const accessToken = await issueSession(req, res, user);
  res.json({ user: toPublicUser(user), accessToken });
});

// Generates (or regenerates) a pending TOTP secret for the logged-in user.
// twoFactorEnabled stays false until confirmed via enable2fa — so scanning
// the QR code alone never activates 2FA on its own.
export const setup2fa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.twoFactorEnabled) throw new ApiError(400, 'Two-factor authentication is already enabled');

  const secret = generateSecret();
  user.twoFactorSecret = secret;
  await user.save();

  const otpauthUrl = generateOtpAuthUrl(user.email, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  res.json({ secret, qrCodeDataUrl });
});

export const enable2fa = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const user = await User.findById(req.userId).select('+twoFactorSecret');
  if (!user) throw new ApiError(404, 'User not found');
  if (user.twoFactorEnabled) throw new ApiError(400, 'Two-factor authentication is already enabled');
  if (!user.twoFactorSecret) throw new ApiError(400, 'Call setup first to get a code to scan');

  if (!(await verifyTotp(code.trim(), user.twoFactorSecret))) {
    throw new ApiError(400, 'Invalid authentication code');
  }

  const backupCodes = generateBackupCodes();
  user.twoFactorEnabled = true;
  user.twoFactorBackupCodeHashes = backupCodes.map(hashBackupCode);
  await user.save();

  // Backup codes are only ever shown this one time — only their hashes are
  // persisted, same principle as password reset tokens.
  res.json({ backupCodes });
});

export const disable2fa = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');

  // Google/GitHub-only accounts have no local password to confirm with —
  // the already-authenticated session is the only factor they have, same as
  // any other protected settings action for such accounts.
  if (user.passwordHash) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Incorrect password');
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = null;
  user.twoFactorBackupCodeHashes = [];
  await user.save();

  res.status(204).send();
});

export const refresh = asyncHandler(async (req, res) => {
  // Which account to refresh — each has its own cookie (see refreshCookieName),
  // so this browser can hold several simultaneously signed-in accounts and
  // the account switcher just calls this again with a different userId.
  const { userId } = req.body;
  const token = req.cookies?.[refreshCookieName(userId)];
  if (!token) {
    throw new ApiError(401, 'No refresh token provided');
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  // The cookie name is trusted to select which token to read, but the token
  // itself is the actual source of truth for identity — confirm they agree
  // rather than assuming the requested userId is who this token is for.
  if (payload.sub !== userId) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+passwordHash +pendingEmail');
  if (!user || user.refreshTokenVersion !== payload.ver) {
    throw new ApiError(401, 'Refresh token has been revoked');
  }
  if (user.suspended) {
    throw new ApiError(403, 'This account has been suspended');
  }

  // The session must still exist (not individually revoked from Settings).
  const session = payload.jti ? await Session.findOne({ jti: payload.jti, user: user._id }) : null;
  if (payload.jti && !session) {
    throw new ApiError(401, 'This session has been signed out');
  }

  const accessToken = signAccessToken(user._id.toString());
  // Rotate the jti in place on the same Session row, rather than creating a
  // new one — a long-lived login refreshes many times but is still one
  // session/device as far as the user is concerned.
  const newJti = crypto.randomUUID();
  const newRefreshToken = signRefreshToken(user._id.toString(), user.refreshTokenVersion, newJti);

  if (session) {
    session.jti = newJti;
    session.lastUsedAt = new Date();
    await session.save();
  }

  res.cookie(refreshCookieName(user._id), newRefreshToken, refreshCookieOptions);
  res.json({ user: toPublicUser(user), accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  // Signs out one account (whichever the client says is active) — other
  // accounts' cookies in this same browser are untouched.
  const { userId } = req.body;
  const cookieName = refreshCookieName(userId);
  const token = req.cookies?.[cookieName];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      if (payload.jti) await Session.deleteOne({ jti: payload.jti });
    } catch {
      // an already-invalid token has nothing to clean up
    }
  }
  res.clearCookie(cookieName, { path: refreshCookieOptions.path });
  res.status(204).send();
});

export const logoutAll = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.userId, { $inc: { refreshTokenVersion: 1 } });
  await Session.deleteMany({ user: req.userId });
  res.clearCookie(refreshCookieName(req.userId), { path: refreshCookieOptions.path });
  res.status(204).send();
});

export const listSessions = asyncHandler(async (req, res) => {
  const currentToken = req.cookies?.[refreshCookieName(req.userId)];
  let currentJti = null;
  if (currentToken) {
    try {
      currentJti = verifyRefreshToken(currentToken).jti;
    } catch {
      // ignore — just means nothing gets marked "this device"
    }
  }

  const sessions = await Session.find({ user: req.userId }).sort({ lastUsedAt: -1 }).lean();
  res.json({
    sessions: sessions.map((s) => ({
      id: s._id,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      current: s.jti === currentJti,
    })),
  });
});

export const revokeSession = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, user: req.userId });
  if (!session) throw new ApiError(404, 'Session not found');
  await session.deleteOne();
  res.status(204).send();
});

// Always responds with the same generic message regardless of whether the
// email is registered, so this endpoint can't be used to enumerate accounts.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const genericMessage = { message: 'If that email is registered, a reset link has been sent.' };

  const user = await User.findOne({ email });
  if (!user) {
    return res.json(genericMessage);
  }

  const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
  user.resetPasswordTokenHash = hashResetToken(rawToken);
  user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const resetUrl = `${env.clientOrigin}/reset-password?token=${rawToken}`;

  // Never await the actual SMTP round-trip here — a slow or unreachable mail
  // server (e.g. a host that blocks/throttles outbound SMTP) previously took
  // this whole request down with it instead of just failing to send the
  // email. The reset token is already saved above, so the link is valid
  // immediately regardless of whether the email itself gets through.
  if (isMailerConfigured()) {
    sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
      // Never log the raw link in production — it's a working
      // account-takeover URL. It's still returned in devResetUrl below for
      // local development, where logging it too is harmless.
      // eslint-disable-next-line no-console
      console.log(
        `[forgot-password] send failed for "${user.email}": ${err.message}` +
          (env.isProd ? '' : ` — link: ${resetUrl}`)
      );
    });
  } else if (!env.isProd) {
    // eslint-disable-next-line no-console
    console.log(`[password reset] ${user.email} -> ${resetUrl}`);
  }

  res.json({ ...genericMessage, ...(env.isProd ? {} : { devResetUrl: resetUrl }) });
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
  await Session.deleteMany({ user: user._id });

  res.status(204).send();
});

// Unlike resetPassword (forgotten-password recovery, where re-login is
// expected), the user is already authenticated here — so instead of just
// invalidating every session, immediately re-issue a fresh token pair for
// *this* session while still bumping refreshTokenVersion to invalidate any
// other outstanding sessions/devices.
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');

  // A Google/GitHub-only account has no current password to check against —
  // point them at "forgot password" (which works for any account, since it's
  // driven entirely by a mailed token) to set one for the first time instead.
  if (!user.passwordHash) {
    throw new ApiError(
      400,
      'This account has no password yet — use "Forgot password?" on the login page to set one'
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Current password is incorrect');

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.refreshTokenVersion += 1;
  await user.save();
  // Every session's version is now stale, including this one — delete them
  // all and issue a brand new session for the device making this request.
  await Session.deleteMany({ user: user._id });

  const accessToken = await issueSession(req, res, user);
  res.json({ user: toPublicUser(user), accessToken });
});

// Doesn't touch `email` yet — see the pendingEmail* fields' comment in the
// User model. Requires the current password (like changePassword/disable2fa)
// so a hijacked-but-still-logged-in session alone can't redirect the
// account's password-reset/security mail to an attacker's inbox.
export const changeEmail = asyncHandler(async (req, res) => {
  const { newEmail, password } = req.body;

  const user = await User.findById(req.userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');

  if (user.passwordHash) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Incorrect password');
  }

  if (newEmail === user.email) {
    throw new ApiError(400, 'That is already your current email address');
  }
  const taken = await User.exists({ email: newEmail });
  if (taken) throw new ApiError(409, 'That email is already in use');

  const rawToken = crypto.randomBytes(VERIFY_TOKEN_BYTES).toString('hex');
  user.pendingEmail = newEmail;
  user.pendingEmailTokenHash = hashResetToken(rawToken);
  user.pendingEmailExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
  await user.save();

  const confirmUrl = `${env.clientOrigin}/confirm-email-change?token=${rawToken}`;
  if (isMailerConfigured()) {
    sendEmailChangeConfirmation(newEmail, confirmUrl).catch((err) => {
      // eslint-disable-next-line no-console
      console.log(
        `[change-email] send failed for "${newEmail}": ${err.message}` +
          (env.isProd ? '' : ` — link: ${confirmUrl}`)
      );
    });
    sendEmailChangeAlert(user.email, newEmail).catch(() => {});
  } else if (!env.isProd) {
    // eslint-disable-next-line no-console
    console.log(`[change-email] ${newEmail} -> ${confirmUrl}`);
  }

  res.json({
    message: 'Confirmation email sent to your new address.',
    ...(env.isProd ? {} : { devConfirmUrl: confirmUrl }),
  });
});

export const confirmEmailChange = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const tokenHash = hashResetToken(token);

  const user = await User.findOne({
    pendingEmailTokenHash: tokenHash,
    pendingEmailExpires: { $gt: new Date() },
  }).select('+passwordHash +pendingEmail +pendingEmailTokenHash +pendingEmailExpires');
  if (!user) {
    throw new ApiError(400, 'That confirmation link is invalid or has expired');
  }

  user.email = user.pendingEmail;
  user.emailVerified = true;
  user.pendingEmail = null;
  user.pendingEmailTokenHash = null;
  user.pendingEmailExpires = null;
  try {
    await user.save();
  } catch (err) {
    // Someone else claimed the address in the time this link sat unused.
    if (err.code === 11000) {
      throw new ApiError(409, 'That email is now in use by another account — request the change again');
    }
    throw err;
  }

  res.json({ user: toPublicUser(user) });
});

export const cancelEmailChange = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.userId, {
    pendingEmail: null,
    pendingEmailTokenHash: null,
    pendingEmailExpires: null,
  });
  res.status(204).send();
});
