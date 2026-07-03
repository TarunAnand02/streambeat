import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

const MULTER_STATUS_BY_CODE = {
  LIMIT_FILE_SIZE: 413,
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const statusCode = MULTER_STATUS_BY_CODE[err.code] || 400;
    return res.status(statusCode).json({ message: err.message });
  }

  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message =
    statusCode < 500 || !env.isProd ? err.message : 'Internal server error';

  if (statusCode >= 500) {
    console.error(err);
  }

  const body = { message };
  if (err instanceof ApiError && err.details) body.details = err.details;
  if (!env.isProd && err.stack) body.stack = err.stack;

  res.status(statusCode).json(body);
}
