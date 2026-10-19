import { Response, Router } from 'express';
import { asyncHandler } from '../../utils/api-error';
import { authenticate, authorize } from '../../middlewares/auth';
import { prisma } from '../../config/prisma';
import { popularBooks } from '../reports/report.routes';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, authorize('admin', 'super_admin'));

/** Ringkasan statistik harian untuk dashboard admin (PRD §14). */
dashboardRouter.get(
  '/stats',
  asyncHandler(async (_req, res: Response) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start7 = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [
      totalBooks,
      totalCopies,
      availableCopies,
      totalMembers,
      activeLoans,
      overdueLoans,
      unpaidFines,
      todayLoans,
      todayReturns,
      recentLoans,
      last7Loans,
      top5,
    ] = await Promise.all([
      prisma.book.count(),
      prisma.bookCopy.count(),
      prisma.bookCopy.count({ where: { status: 'available' } }),
      prisma.user.count({ where: { role: { in: ['siswa', 'guru'] }, isActive: true } }),
      prisma.loan.count({ where: { status: { in: ['borrowed', 'overdue'] } } }),
      prisma.loan.count({ where: { status: { in: ['borrowed', 'overdue'] }, dueDate: { lt: now } } }),
      prisma.fine.aggregate({ where: { status: 'unpaid' }, _sum: { amount: true }, _count: true }),
      prisma.loan.count({ where: { loanDate: { gte: startOfToday } } }),
      prisma.loan.count({ where: { returnDate: { gte: startOfToday } } }),
      prisma.loan.findMany({
        orderBy: { loanDate: 'desc' },
        take: 6,
        include: {
          user: { select: { id: true, name: true, identifier: true, classOrPosition: true } },
          bookCopy: { include: { book: { select: { id: true, title: true } } } },
        },
      }),
      prisma.loan.findMany({ where: { loanDate: { gte: start7 } }, select: { loanDate: true } }),
      popularBooks('month', 5),
    ]);

    // series 7 hari terakhir
    const series: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, count: last7Loans.filter((l) => l.loanDate.toISOString().slice(0, 10) === key).length });
    }

    res.json({
      success: true,
      data: {
        totalBooks,
        totalCopies,
        availableCopies,
        borrowedCopies: totalCopies - availableCopies,
        totalMembers,
        activeLoans,
        overdueLoans,
        unpaidFinesCount: unpaidFines._count,
        unpaidFinesTotal: Number(unpaidFines._sum.amount ?? 0),
        todayLoans,
        todayReturns,
        series,
        recentLoans,
        top5,
      },
    });
  })
);
