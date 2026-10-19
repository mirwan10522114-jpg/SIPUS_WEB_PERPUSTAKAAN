import cron from 'node-cron';
import { prisma } from '../config/prisma';

/**
 * Pekerjaan harian:
 * 1. Tandai peminjaman yang lewat jatuh tempo sebagai overdue.
 * 2. Kedaluwarsakan reservasi "ready" yang tidak diambil dalam batas waktu (FR-23).
 * 3. Kirim pengingat jatuh tempo H-1 (user story siswa §7).
 */
export async function runDailyJobs(): Promise<void> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 1. Overdue
  const overdueLoans = await prisma.loan.findMany({
    where: { status: 'borrowed', dueDate: { lt: now } },
    include: { bookCopy: { include: { book: true } }, user: true },
  });
  for (const loan of overdueLoans) {
    await prisma.loan.update({ where: { id: loan.id }, data: { status: 'overdue' } });
    const recent = await prisma.notification.findFirst({
      where: { userId: loan.userId, title: 'Buku Terlambat', createdAt: { gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) } },
    });
    if (!recent) {
      await prisma.notification.create({
        data: {
          userId: loan.userId,
          title: 'Buku Terlambat',
          message: `Buku "${loan.bookCopy.book.title}" telah melewati jatuh tempo. Denda terhitung Rp1.000/hari — segera kembalikan.`,
        },
      });
    }
  }

  // 2. Expire reservasi ready yang lewat readyUntil (FR-23)
  const expired = await prisma.reservation.findMany({
    where: { status: 'ready', readyUntil: { lt: now } },
    include: { book: true, user: true },
  });
  for (const res of expired) {
    await prisma.reservation.update({ where: { id: res.id }, data: { status: 'expired' } });
    await prisma.notification.create({
      data: {
        userId: res.userId,
        title: 'Reservasi Kedaluwarsa',
        message: `Reservasi buku "${res.book.title}" kedaluwarsa karena tidak diambil dalam batas waktu. Anda dapat mereservasi ulang.`,
      },
    });
  }

  // 3. Pengingat jatuh tempo besok (H-1)
  const dueSoon = await prisma.loan.findMany({
    where: { status: 'borrowed', dueDate: { gte: now, lt: tomorrow } },
    include: { bookCopy: { include: { book: true } }, user: true },
  });
  for (const loan of dueSoon) {
    const recent = await prisma.notification.findFirst({
      where: { userId: loan.userId, title: 'Pengingat Jatuh Tempo', createdAt: { gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) } },
    });
    if (!recent) {
      await prisma.notification.create({
        data: {
          userId: loan.userId,
          title: 'Pengingat Jatuh Tempo',
          message: `Buku "${loan.bookCopy.book.title}" akan jatuh tempo besok (${loan.dueDate.toLocaleDateString('id-ID')}). Segera kembalikan agar tidak terkena denda.`,
        },
      });
    }
  }

  if (overdueLoans.length || expired.length || dueSoon.length) {
    console.log(`[cron] overdue=${overdueLoans.length} expiredRes=${expired.length} dueSoon=${dueSoon.length}`);
  }
}

export function startCronJobs(): void {
  runDailyJobs().catch((e) => console.error('[cron] initial run failed', e));
  cron.schedule('0 7 * * *', () => {
    runDailyJobs().catch((e) => console.error('[cron] scheduled run failed', e));
  });
}
