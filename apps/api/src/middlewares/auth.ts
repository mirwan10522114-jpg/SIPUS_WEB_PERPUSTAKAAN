import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { ApiError } from '../utils/api-error';
import { prisma } from '../config/prisma';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Silakan login terlebih dahulu'));
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = payload;
    next();
  } catch {
    next(new ApiError(401, 'Sesi tidak valid atau kedaluwarsa, silakan login ulang'));
  }
}

/**
 * Middleware otorisasi role-based (PRD §15).
 * Pemakaian: authorize('admin', 'super_admin')
 */
export function authorize(...roles: string[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, 'Silakan login terlebih dahulu'));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Anda tidak memiliki akses untuk operasi ini'));
    }
    // verifikasi user masih aktif di database
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || !user.isActive) {
      return next(new ApiError(403, 'Akun Anda tidak aktif'));
    }
    next();
  };
}
