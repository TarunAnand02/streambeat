import rateLimit from 'express-rate-limit';

// Guards credential-guessing endpoints (register/login) — a real brute-force
// surface, so kept tight.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

// /refresh requires an already-valid signed refresh token, so it isn't a
// brute-force target the way register/login are — but the client calls it
// on every full page load (see restoreSession), so it needs a much looser
// budget or normal browsing would lock users out.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

// Guards against email-bombing an address and against using response timing
// to enumerate registered emails — kept as tight as the credential-guessing
// limiter since it's a similar-risk endpoint (unauthenticated, targets a
// specific account).
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Upload limit reached, please try again later.' },
});

// Guards our YouTube Data API quota from abuse.
export const youtubeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'YouTube import limit reached, please try again later.' },
});

// Fires on every keystroke while typing a search, so needs a much looser
// per-minute budget than a normal endpoint — still bounded against a
// scripted flood, just generous enough that real typing never trips it.
export const suggestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many search requests, please slow down.' },
});

// Server-side URL fetch + disk write is heavier than a normal request (and
// is the endpoint an SSRF/abuse attempt would target), so keep it as tight
// as native uploads.
export const urlImportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Import limit reached, please try again later.' },
});
