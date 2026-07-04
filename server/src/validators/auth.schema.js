import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters'),
  }),
  query: z.any(),
  params: z.any(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
  query: z.any(),
  params: z.any(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
  }),
  query: z.any(),
  params: z.any(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters'),
  }),
  query: z.any(),
  params: z.any(),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
  query: z.any(),
  params: z.any(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters'),
  }),
  query: z.any(),
  params: z.any(),
});

export const verifyLogin2faSchema = z.object({
  body: z.object({
    tempToken: z.string().min(1, 'Login attempt token is required'),
    code: z.string().min(1, 'Authentication code is required'),
  }),
  query: z.any(),
  params: z.any(),
});

export const enable2faSchema = z.object({
  body: z.object({
    code: z.string().min(1, 'Authentication code is required'),
  }),
  query: z.any(),
  params: z.any(),
});

export const disable2faSchema = z.object({
  // Optional — accounts with no local password (Google/GitHub sign-in only)
  // have nothing to check it against; see disable2fa in auth.controller.js.
  body: z.object({
    password: z.string().optional(),
  }),
  query: z.any(),
  params: z.any(),
});

export const sessionIdSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid session id'),
  }),
});
