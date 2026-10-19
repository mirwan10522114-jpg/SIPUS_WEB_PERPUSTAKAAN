import { Response, Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../../utils/api-error';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/audit';

export const announcementsRouter = Router();

const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').max(200),
  content: z.string().trim().min(1, 'Isi pengumuman wajib diisi').max(10000),
  isActive: z.boolean().default(true),
});
const idParam = z.object({ id: z.coerce.number().int().positive() });

// Admin: seluruh pengumuman termasuk yang nonaktif
announcementsRouter.get(
  '/admin/all',
  authenticate, authorize('admin', 'super_admin'),
  asyncHandler(async (_req, res: Response) => {
    const data = await prisma.announcement.findMany({
      include: { publisher: { select: { id: true, name: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data });
  })
);

// Publik: hanya pengumuman aktif
announcementsRouter.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10));
    const data = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: { publisher: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data });
  })
);

announcementsRouter.post(
  '/',
  authenticate, authorize('admin', 'super_admin'),
  validate({ body: announcementSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const item = await prisma.announcement.create({
      data: { ...req.body, publishedBy: req.user!.userId },
      include: { publisher: { select: { id: true, name: true } } },
    });
    await logActivity(req.user!.userId, 'CREATE_ANNOUNCEMENT', 'announcement', item.id);
    res.status(201).json({ success: true, data: item, message: 'Pengumuman berhasil dibuat' });
  })
);

announcementsRouter.put(
  '/:id',
  authenticate, authorize('admin', 'super_admin'),
  validate({ params: idParam, body: announcementSchema.partial() }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = (req.params as any).id;
    await prisma.announcement.findUniqueOrThrow({ where: { id } });
    const item = await prisma.announcement.update({
      where: { id },
      data: req.body,
      include: { publisher: { select: { id: true, name: true } } },
    });
    await logActivity(req.user!.userId, 'UPDATE_ANNOUNCEMENT', 'announcement', id);
    res.json({ success: true, data: item, message: 'Pengumuman berhasil diperbarui' });
  })
);

announcementsRouter.delete(
  '/:id',
  authenticate, authorize('admin', 'super_admin'),
  validate({ params: idParam }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = (req.params as any).id;
    await prisma.announcement.delete({ where: { id } });
    await logActivity(req.user!.userId, 'DELETE_ANNOUNCEMENT', 'announcement', id);
    res.json({ success: true, message: 'Pengumuman berhasil dihapus' });
  })
);
