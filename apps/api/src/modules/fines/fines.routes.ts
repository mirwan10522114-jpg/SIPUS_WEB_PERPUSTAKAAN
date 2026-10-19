import { Response, Router } from 'express';
import { Prisma } from '@prisma/client';
import { asyncHandler, ApiError } from '../../utils/api-error';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/audit';
import { parsePagination, paginationMeta, prismaSkipTake } from '../../utils/pagination';

export const finesRouter = Router();

const fineInclude = {
  loan: {
    include: {
      user: { select: { id: true, identifier: true, name: true, role: true, classOrPosition: true } },
      bookCopy: { include: { book: { select: { id: true, title: true, author: true } } } },
    },
  },
} satisfies Prisma.FineInclude;

finesRouter.use(authenticate);

// Denda milik sendiri (siswa/guru)
finesRouter.get(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const fines = await prisma.fine.findMany({
      where: { loan: { userId: req.user!.userId } },
      include: fineInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: fines });
  })
);

// List semua denda (admin)
finesRouter.get(
  '/',
  authorize('admin', 'super_admin'),
  asyncHandler(async (req, res: Response) => {
    const { page, limit } = parsePagination(req.query, 15);
    const status = req.query.status === 'paid' || req.query.status === 'unpaid' ? String(req.query.status) : undefined;
    const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
    const where: Prisma.FineWhereInput = {
      AND: [
        status ? { status: status as any } : {},
        q
          ? {
              OR: [
                { loan: { user: { name: { contains: q } } } },
                { loan: { user: { identifier: { contains: q } } } },
                { loan: { bookCopy: { book: { title: { contains: q } } } } },
              ],
            }
          : {},
      ],
    };
    const { skip, take } = prismaSkipTake(page, limit);
    const [fines, total, aggregate] = await Promise.all([
      prisma.fine.findMany({ where, include: fineInclude, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.fine.count({ where }),
      prisma.fine.aggregate({ where: { status: 'unpaid' }, _sum: { amount: true }, _count: true }),
    ]);
    res.json({
      success: true,
      data: fines,
      meta: { ...paginationMeta(total, page, limit), unpaidTotal: Number(aggregate._sum.amount ?? 0), unpaidCount: aggregate._count },
    });
  })
);

// Tandai denda lunas (admin)
finesRouter.put(
  '/:id/pay',
  authorize('admin', 'super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) throw new ApiError(400, 'ID denda tidak valid');
    const fine = await prisma.fine.findUnique({ where: { id } });
    if (!fine) throw new ApiError(404, 'Denda tidak ditemukan');
    if (fine.status === 'paid') throw new ApiError(409, 'Denda ini sudah lunas');
    const updated = await prisma.fine.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date(), paidBy: req.user!.userId },
      include: fineInclude,
    });
    await logActivity(req.user!.userId, 'PAY_FINE', 'fine', id);
    res.json({ success: true, data: updated, message: 'Denda berhasil ditandai lunas' });
  })
);
