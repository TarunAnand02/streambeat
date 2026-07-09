import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokens.js';

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Not authenticated');
  }

  let userId;
  try {
    const payload = verifyAccessToken(token);
    userId = payload.sub;
  } catch {
    throw new ApiError(401, 'Invalid or expired access token');
  }

  // Checked on every request (not just at login) so a suspension takes
  // effect immediately against an already-issued access token, not just on
  // the suspended user's next login attempt.
  const user = await User.findById(userId).select('suspended');
  if (user?.suspended) {
    throw new ApiError(403, 'This account has been suspended');
  }

  req.userId = userId;
  next();
});

// Must run after `protect` (needs req.userId already set).
export const requireAdmin = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.userId).select('isAdmin');
  if (!user?.isAdmin) {
    throw new ApiError(403, 'Admin access required');
  }
  next();
});

// For routes that behave the same for everyone but personalize slightly when
// logged in (e.g. recording watch history on view). Never rejects — an
// absent/invalid token just leaves req.userId unset.
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      const payload = verifyAccessToken(token);
      req.userId = payload.sub;
    } catch {
      // ignore — treat as anonymous
    }
  }
  next();
});
