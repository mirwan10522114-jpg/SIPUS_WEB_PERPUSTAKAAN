import { Response, Router } from 'express';
import { z } from 'zod';
import { Prisma, ReservationStatus } from '@prisma/client';
import { asyncHandler, ApiError } from '../../utils/api-error';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/audit';

export const reservationsRouter = Router();

const reservationInclude = {
  user: { select: { id: true, identifier: true, name: true, role: true, classOrPosition: true } },
  book: { include: { category: true } },
} satisfies Prisma.ReservationInclude;

const createSchema = z.object({
  bookId: z.coerce.number().int().positive('ID buku tidak valid'),
});

reservationsRouter.use(authenticate);

// Reservasi milik sendiri
reservationsRouter.get(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await prisma.reservation.findMany({
      where: { userId: req.user!.userId },
      include: reservationInclude,
      orderBy: { reservationDate: 'desc' },
      take: 50,
    });
    res.json({ success: true, data });
  })
);

// Buat reservasi (siswa/guru) — hanya jika semua eksemplar sedang dipinjam (FR-21)
reservationsRouter.post(
  '/',
  authorize('siswa', 'guru', 'admin', 'super_admin'),
  validate({ body: createSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const bookId = req.body.bookId;
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { _count: { select: { copies: { where: { status: 'available' } } } } },
    });
    if (!book) throw new ApiError(404, 'Buku tidak ditemukan');

    const available = book._count.copies;
    if (available > 0) {
      throw new ApiError(409, 'Buku ini masih tersedia — silakan datang ke perpustakaan untuk meminjam');
    }

    const existing = await prisma.reservation.findFirst({
      where: { userId: req.user!.userId, bookId, status: { in: [ReservationStatus.waiting, ReservationStatus.ready] } },
    });
    if (existing) throw new ApiError(409, 'Anda sudah memiliki reservasi aktif untuk buku ini');

    const queuePosition = await prisma.reservation.count({
      where: { bookId, status: { in: [ReservationStatus.waiting, ReservationStatus.ready] } },
    });

    const reservation = await prisma.reservation.create({
      data: { userId: req.user!.userId, bookId, status: ReservationStatus.waiting },
      include: reservationInclude,
    });
    await logActivity(req.user!.userId, 'CREATE_RESERVATION', 'reservation', reservation.id);
    res.status(201).json({
      success: true,
      data: { ...reservation, queuePosition: queuePosition + 1 },
      message: `Reservasi berhasil dibuat (antrean nomor ${queuePosition + 1}). Anda akan diberi tahu saat buku tersedia.`,
    });
  })
);

// Batalkan reservasi — pemiliknya atau admin (FR §12)
reservationsRouter.put(
  '/:id/cancel',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) throw new ApiError(400, 'ID reservasi tidak valid');
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new ApiError(404, 'Reservasi tidak ditemukan');
    const isOwner = reservation.userId === req.user!.userId;
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
    if (!isOwner && !isAdmin) throw new ApiError(403, 'Anda hanya dapat membatalkan reservasi milik sendiri');
    if (!['waiting', 'ready'].includes(reservation.status)) {
      throw new ApiError(409, 'Reservasi ini sudah tidak dapat dibatalkan');
    }
    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.cancelled },
      include: reservationInclude,
    });
    await logActivity(req.user!.userId, 'CANCEL_RESERVATION', 'reservation', id);
    res.json({ success: true, data: updated, message: 'Reservasi berhasil dibatalkan' });
  })
);

// Semua reservasi (admin)
reservationsRouter.get(
  '/',
  authorize('admin', 'super_admin'),
  asyncHandler(async (_req, res: Response) => {
    const status = _req.query.status as ReservationStatus | undefined;
    const data = await prisma.reservation.findMany({
      where: status ? { status } : undefined,
      include: reservationInclude,
      orderBy: { reservationDate: 'desc' },
      take: 200,
    });
    res.json({ success: true, data });
  })
);
