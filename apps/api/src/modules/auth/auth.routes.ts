import { Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../utils/api-error';
import { validate } from '../../middlewares/validate';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { loginSchema, changePasswordSchema } from './auth.schemas';
import { login, refresh, changePassword, toPublicUser } from './auth.service';
import { prisma } from '../../config/prisma';

/** Rate limiting login untuk mencegah brute force (PRD §15). */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
});

export const authRouter = Router();

authRouter.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res: Response) => {
    const result = await login(req.body.identifier.trim(), req.body.password);
    res.json({ success: true, data: result });
  })
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res: Response) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken wajib dikirim' });
    }
    const result = await refresh(refreshToken);
    res.json({ success: true, data: result });
  })
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    res.json({ success: true, data: { user: toPublicUser(user) } });
  })
);

authRouter.put(
  '/me/password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
    res.json({ success: true, message: 'Password berhasil diubah' });
  })
);
