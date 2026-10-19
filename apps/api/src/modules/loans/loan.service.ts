import { Prisma, LoanStatus, CopyStatus, ReservationStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { logActivity } from '../../utils/audit';
import { parsePagination, paginationMeta, prismaSkipTake } from '../../utils/pagination';
import { computeDueDate, computeLateDays, computeFineAmount } from '../../utils/fine-calc';
import { getNumberSetting, maxLoansKeyForRole } from '../../utils/settings';

export const loanInclude = {
  user: { select: { id: true, identifier: true, name: true, role: true, classOrPosition: true } },
  bookCopy: { include: { book: { include: { category: true } } } },
  fines: true,
  processed: { select: { id: true, name: true } },
} satisfies Prisma.LoanInclude;

/**
 * Alur peminjaman (PRD §13.1):
 * validasi anggota → cek denda → cek kuota → cek eksemplar → buat loan + due_date otomatis.
 */
export async function createLoan(data: any, actorId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Resolusi anggota
    const user = await tx.user.findUnique({
      where: data.userId ? { id: data.userId } : { identifier: data.userIdentifier },
    });
    if (!user) throw new ApiError(404, 'Anggota tidak ditemukan');
    if (user.role !== 'siswa' && user.role !== 'guru') {
      throw new ApiError(400, 'Hanya siswa/guru yang dapat meminjam buku');
    }
    if (!user.isActive) throw new ApiError(403, 'Keanggotaan tidak aktif — hubungi pustakawan');

    // 2. FR-18: tolak jika masih ada denda belum lunas
    const unpaidFines = await tx.fine.aggregate({
      where: { status: 'unpaid', loan: { userId: user.id } },
      _sum: { amount: true },
      _count: true,
    });
    if ((unpaidFines._count ?? 0) > 0) {
      const total = Number(unpaidFines._sum.amount ?? 0);
      throw new ApiError(
        403,
        `Anggota masih memiliki ${unpaidFines._count} denda belum lunas (total Rp${total.toLocaleString('id-ID')}). Lunasi terlebih dahulu.`
      );
    }

    // 3. FR-14: cek kuota pinjam per role
    const quota = await getNumberSetting(maxLoansKeyForRole(user.role));
    const activeLoans = await tx.loan.count({
      where: { userId: user.id, status: { in: [LoanStatus.borrowed, LoanStatus.overdue] } },
    });
    if (activeLoans >= quota) {
      throw new ApiError(403, `Kuota peminjaman tercapai (maksimal ${quota} buku untuk ${user.role})`);
    }

    // 4. Resolusi eksemplar & validasi tersedia
    const copy = await tx.bookCopy.findUnique({
      where: data.copyId ? { id: data.copyId } : { inventoryCode: data.copyCode },
      include: { book: true },
    });
    if (!copy) throw new ApiError(404, 'Eksemplar buku tidak ditemukan — periksa kode inventaris');
    if (copy.status !== CopyStatus.available) {
      throw new ApiError(409, `Eksemplar tidak tersedia (status: ${copy.status})`);
    }

    // 5. FR-17: due_date otomatis
    const loanDays = data.loanDays ?? (await getNumberSetting('loan_days'));
    const loanDate = new Date();
    const dueDate = computeDueDate(loanDate, loanDays);

    const loan = await tx.loan.create({
      data: {
        userId: user.id,
        bookCopyId: copy.id,
        loanDate,
        dueDate,
        status: LoanStatus.borrowed,
        processedBy: actorId,
      },
      include: loanInclude,
    });
    await tx.bookCopy.update({ where: { id: copy.id }, data: { status: CopyStatus.borrowed } });

    // Jika anggota memiliki reservasi "ready" untuk buku ini → tandai fulfilled
    const readyRes = await tx.reservation.findFirst({
      where: { userId: user.id, bookId: copy.bookId, status: ReservationStatus.ready },
    });
    if (readyRes) {
      await tx.reservation.update({ where: { id: readyRes.id }, data: { status: ReservationStatus.fulfilled } });
    }

    return loan;
  });

  await logActivity(actorId, 'CREATE_LOAN', 'loan', result.id);
  return result;
}

/**
 * Alur pengembalian (PRD §13.2): cari loan aktif → hitung keterlambatan →
 * denda otomatis → update eksemplar → picu reservasi waiting terlama.
 */
export async function returnLoan(params: { loanId?: number; copyCode?: string }, actorId: number) {
  let loan;
  if (params.loanId) {
    loan = await prisma.loan.findUnique({ where: { id: params.loanId }, include: { bookCopy: true } });
  } else if (params.copyCode) {
    const copy = await prisma.bookCopy.findUnique({ where: { inventoryCode: params.copyCode } });
    if (!copy) throw new ApiError(404, 'Eksemplar tidak ditemukan — periksa kode inventaris');
    loan = await prisma.loan.findFirst({
      where: { bookCopyId: copy.id, status: { in: [LoanStatus.borrowed, LoanStatus.overdue] } },
      include: { bookCopy: true },
    });
  }
  if (!loan) throw new ApiError(404, 'Tidak ditemukan peminjaman aktif untuk eksemplar tersebut');
  if (loan.status !== LoanStatus.borrowed && loan.status !== LoanStatus.overdue) {
    throw new ApiError(409, 'Peminjaman ini sudah tidak aktif');
  }

  const returnDate = new Date();
  const lateDays = computeLateDays(loan.dueDate, returnDate);
  const finePerDay = await getNumberSetting('fine_per_day');
  const fineAmount = computeFineAmount(lateDays, finePerDay);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.loan.update({
      where: { id: loan.id },
      data: { returnDate, status: LoanStatus.returned },
      include: loanInclude,
    });

    let fine = null;
    if (fineAmount > 0) {
      fine = await tx.fine.create({
        data: {
          loanId: loan.id,
          amount: fineAmount,
          reason: `Terlambat ${lateDays} hari`,
          status: 'unpaid',
        },
      });
    }

    await tx.bookCopy.update({ where: { id: loan.bookCopyId }, data: { status: CopyStatus.available } });

    // FR-22 / §13.3: notifikasi antrean reservasi paling awal
    const nextReservation = await tx.reservation.findFirst({
      where: { bookId: loan.bookCopy.bookId, status: ReservationStatus.waiting },
      orderBy: { reservationDate: 'asc' },
      include: { book: true, user: true },
    });
    if (nextReservation) {
      const holdDays = await getNumberSetting('reservation_hold_days');
      const readyUntil = new Date(returnDate.getTime() + holdDays * 24 * 60 * 60 * 1000);
      await tx.reservation.update({
        where: { id: nextReservation.id },
        data: { status: ReservationStatus.ready, readyUntil },
      });
      await tx.notification.create({
        data: {
          userId: nextReservation.userId,
          title: 'Buku Reservasi Siap Diambil',
          message: `Buku "${nextReservation.book.title}" sudah tersedia dan menunggu Anda. Silakan ambil sebelum ${readyUntil.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}, setelah itu reservasi akan kedaluwarsa.`,
        },
      });
    }

    return { loan: updated, fine };
  });

  await logActivity(actorId, 'RETURN_LOAN', 'loan', loan.id);
  return result;
}

export async function listLoans(query: any) {
  const { page, limit } = parsePagination(query, 15);
  const { status, q } = query;

  const where: Prisma.LoanWhereInput = {
    AND: [
      status === 'active'
        ? { status: { in: [LoanStatus.borrowed, LoanStatus.overdue] } }
        : status === 'all'
          ? {}
          : { status: status as LoanStatus },
      q
        ? {
            OR: [
              { user: { name: { contains: q } } },
              { user: { identifier: { contains: q } } },
              { bookCopy: { book: { title: { contains: q } } } },
              { bookCopy: { inventoryCode: { contains: q } } },
            ],
          }
        : {},
    ],
  };

  const { skip, take } = prismaSkipTake(page, limit);
  const [loans, total] = await Promise.all([
    prisma.loan.findMany({ where, include: loanInclude, orderBy: { loanDate: 'desc' }, skip, take }),
    prisma.loan.count({ where }),
  ]);
  return { data: loans, meta: paginationMeta(total, page, limit) };
}

export async function myLoans(userId: number, status?: string) {
  const where: Prisma.LoanWhereInput = {
    userId,
    ...(status === 'active' ? { status: { in: [LoanStatus.borrowed, LoanStatus.overdue] } } : {}),
  };
  const loans = await prisma.loan.findMany({
    where,
    include: loanInclude,
    orderBy: { loanDate: 'desc' },
    take: 100,
  });
  return loans;
}
