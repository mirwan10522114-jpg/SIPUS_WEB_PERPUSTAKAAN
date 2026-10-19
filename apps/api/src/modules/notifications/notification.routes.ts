import { Response, Router } from 'express';
import { asyncHandler, ApiError } from '../../utils/api-error';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { prisma } from '../../config/prisma';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
    ]);
    res.json({ success: true, data: items, meta: { unreadCount } });
  })
);

notificationsRouter.put(
  '/:id/read',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) throw new ApiError(400, 'ID notifikasi tidak valid');
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== req.user!.userId) throw new ApiError(404, 'Notifikasi tidak ditemukan');
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true, message: 'Notifikasi ditandai terbaca' });
  })
);

notificationsRouter.put(
  '/read-all',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'Semua notifikasi ditandai terbaca' });
  })
);
