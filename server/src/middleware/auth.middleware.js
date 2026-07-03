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

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    throw new ApiError(401, 'Invalid or expired access token');
  }
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
