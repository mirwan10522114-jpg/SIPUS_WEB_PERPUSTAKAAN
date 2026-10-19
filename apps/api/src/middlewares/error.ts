import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, `Endpoint tidak ditemukan: ${req.method} ${req.path}`));
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  let status = err instanceof ApiError ? err.status : 500;
  let message = err instanceof Error ? err.message : 'Terjadi kesalahan internal';

  if (err?.name === 'ZodError') {
    status = 400;
    const first = err.issues?.[0];
    message = first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Data tidak valid';
  }
  if (err?.code === 'P2002') {
    status = 409;
    message = 'Data sudah ada (duplikat nilai unik)';
  }
  if (err?.code === 'P2025') {
    status = 404;
    message = 'Data tidak ditemukan';
  }

  if (status >= 500) {
    console.error('[API ERROR]', err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && status >= 500 ? { stack: err?.stack } : {}),
  });
}
