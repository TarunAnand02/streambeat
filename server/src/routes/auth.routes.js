import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as oauthController from '../controllers/oauth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authLimiter, passwordResetLimiter, refreshLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  changePasswordSchema,
  disable2faSchema,
  enable2faSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sessionIdSchema,
  verifyEmailSchema,
  verifyLogin2faSchema,
} from '../validators/auth.schema.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', protect, authController.logoutAll);
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);
router.post(
  '/change-password',
  protect,
  passwordResetLimiter,
  validate(changePasswordSchema),
  authController.changePassword
);
router.post(
  '/verify-email',
  passwordResetLimiter,
  validate(verifyEmailSchema),
  authController.verifyEmail
);
router.post(
  '/resend-verification',
  protect,
  passwordResetLimiter,
  authController.resendVerification
);
router.post(
  '/2fa/verify-login',
  authLimiter,
  validate(verifyLogin2faSchema),
  authController.verifyLogin2fa
);
router.post('/2fa/setup', protect, authController.setup2fa);
router.post('/2fa/enable', protect, validate(enable2faSchema), authController.enable2fa);
router.post('/2fa/disable', protect, validate(disable2faSchema), authController.disable2fa);
router.get('/sessions', protect, authController.listSessions);
router.delete('/sessions/:id', protect, validate(sessionIdSchema), authController.revokeSession);

router.get('/oauth-config', oauthController.oauthConfig);
router.get('/google', authLimiter, oauthController.googleLogin);
router.get('/google/callback', authLimiter, oauthController.googleCallback);
router.get('/github', authLimiter, oauthController.githubLogin);
router.get('/github/callback', authLimiter, oauthController.githubCallback);

export default router;
