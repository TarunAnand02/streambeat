import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpires,
  });
}

// `jti` identifies this specific session (see models/Session.js) — distinct
// from `ver`, which invalidates every session at once on logout-all/password
// change. Together they support both a single-device revoke and a
// nuke-everything option.
export function signRefreshToken(userId, version, jti) {
  return jwt.sign({ sub: userId, ver: version, jti }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpires,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

// Short-lived token identifying a user who has passed password verification
// but still owes a TOTP/backup code before a real session is issued. Signed
// with the same secret as the access token but carries a distinct `purpose`
// claim so it can never be mistaken for (or reused as) a real access token.
export function sign2faPendingToken(userId) {
  return jwt.sign({ sub: userId, purpose: '2fa-pending' }, env.jwtAccessSecret, {
    expiresIn: '5m',
  });
}

export function verify2faPendingToken(token) {
  const payload = jwt.verify(token, env.jwtAccessSecret);
  if (payload.purpose !== '2fa-pending') {
    throw new Error('Invalid token purpose');
  }
  return payload;
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

export const REFRESH_COOKIE_NAME = 'refreshToken';

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, mirrors JWT_REFRESH_EXPIRES default
};
