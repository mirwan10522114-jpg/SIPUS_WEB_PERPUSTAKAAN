import { Response, Router } from 'express';
import { asyncHandler } from '../../utils/api-error';
import { authenticate, authorize } from '../../middlewares/auth';
import { prisma } from '../../config/prisma';
import { computeLateDays } from '../../utils/fine-calc';
import { buildWorkbook, SheetSpec } from '../../utils/excel';

export const reportsRouter = Router();

reportsRouter.use(authenticate, authorize('admin', 'super_admin'));

function parseRange(period?: string): { start?: Date } {
  if (period === 'month') {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    return { start };
  }
  if (period === '90d') {
    return { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
  }
  return {};
}

/** FR-27: Buku terpopuler berdasarkan frekuensi pinjam. */
export async function popularBooks(period?: string, limit = 10) {
  const { start } = parseRange(period);
  const loans = await prisma.loan.findMany({
    where: start ? { loanDate: { gte: start } } : undefined,
    include: { bookCopy: { include: { book: true } } },
  });
  const counts = new Map<number, { title: string; author: string; count: number }>();
  for (const loan of loans) {
    const b = loan.bookCopy.book;
    const entry = counts.get(b.id) ?? { title: b.title, author: b.author, count: 0 };
    entry.count++;
    counts.set(b.id, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/** FR-28: Daftar buku overdue/terlambat + perhitungan hari & estimasi denda. */
export async function overdueLoans() {
  const now = new Date();
  const loans = await prisma.loan.findMany({
    where: {
      status: { in: ['borrowed', 'overdue'] },
      dueDate: { lt: now },
    },
    include: {
      user: { select: { id: true, identifier: true, name: true, role: true, classOrPosition: true } },
      bookCopy: { include: { book: { select: { id: true, title: true, author: true } } } },
    },
    orderBy: { dueDate: 'asc' },
  });
  const finePerDay = parseInt((await prisma.setting.findUnique({ where: { key: 'fine_per_day' } }))?.value ?? '1000', 10);
  return loans.map((loan) => {
    const lateDays = computeLateDays(loan.dueDate, now);
    return { ...loan, lateDays, estimatedFine: lateDays * finePerDay };
  });
}

/** FR-29: Jumlah transaksi per periode (14 hari terakhir / 12 bulan terakhir). */
export async function transactionsPerPeriod(period: 'day' | 'month' = 'day') {
  const now = new Date();
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const loans = await prisma.loan.findMany({ where: { loanDate: { gte: start } }, select: { loanDate: true } });
    const map = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
    }
    for (const l of loans) {
      const key = `${l.loanDate.getFullYear()}-${String(l.loanDate.getMonth() + 1).padStart(2, '0')}`;
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([period, count]) => ({ period, count }));
  }
  const start = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
  const loans = await prisma.loan.findMany({ where: { loanDate: { gte: start } }, select: { loanDate: true } });
  const map = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const l of loans) {
    const key = l.loanDate.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([period, count]) => ({ period, count }));
}

// ---------------- Routes ----------------
reportsRouter.get(
  '/popular-books',
  asyncHandler(async (req, res: Response) => {
    const period = typeof req.query.period === 'string' ? req.query.period : undefined;
    const data = await popularBooks(period);
    res.json({ success: true, data });
  })
);

reportsRouter.get(
  '/overdue',
  asyncHandler(async (_req, res: Response) => {
    const data = await overdueLoans();
    res.json({ success: true, data });
  })
);

reportsRouter.get(
  '/transactions',
  asyncHandler(async (req, res: Response) => {
    const period = req.query.period === 'month' ? 'month' : 'day';
    const data = await transactionsPerPeriod(period);
    res.json({ success: true, data });
  })
);

/** FR-30: Export laporan ke Excel. */
reportsRouter.get(
  '/export',
  asyncHandler(async (req, res: Response) => {
    const type = String(req.query.type ?? 'popular');
    let sheet: SheetSpec;
    let filename: string;

    if (type === 'overdue') {
      const rows = await overdueLoans();
      sheet = {
        name: 'Buku Terlambat',
        columns: [
          { header: 'NIS/NIP', key: 'identifier' },
          { header: 'Nama', key: 'name' },
          { header: 'Kelas/Jabatan', key: 'classOrPosition' },
          { header: 'Judul Buku', key: 'title' },
          { header: 'Kode Eksemplar', key: 'inventoryCode' },
          { header: 'Tgl Pinjam', key: 'loanDate' },
          { header: 'Jatuh Tempo', key: 'dueDate' },
          { header: 'Terlambat (hari)', key: 'lateDays' },
          { header: 'Estimasi Denda (Rp)', key: 'estimatedFine' },
        ],
        rows: rows.map((r: any) => ({
          identifier: r.user.identifier,
          name: r.user.name,
          classOrPosition: r.user.classOrPosition ?? '-',
          title: r.bookCopy.book.title,
          inventoryCode: r.bookCopy.inventoryCode,
          loanDate: new Date(r.loanDate).toLocaleDateString('id-ID'),
          dueDate: new Date(r.dueDate).toLocaleDateString('id-ID'),
          lateDays: r.lateDays,
          estimatedFine: r.estimatedFine,
        })),
      };
      filename = 'laporan-keterlambatan';
    } else if (type === 'transactions') {
      const period = req.query.period === 'month' ? 'month' : 'day';
      const rows = await transactionsPerPeriod(period);
      sheet = {
        name: 'Transaksi',
        columns: [
          { header: period === 'month' ? 'Bulan' : 'Tanggal', key: 'period' },
          { header: 'Jumlah Peminjaman', key: 'count' },
        ],
        rows: rows.map((r) => ({ period: r.period, count: r.count })),
      };
      filename = `laporan-transaksi-${period === 'month' ? 'bulanan' : 'harian'}`;
    } else {
      const period = typeof req.query.period === 'string' ? req.query.period : undefined;
      const rows = await popularBooks(period);
      sheet = {
        name: 'Buku Terpopuler',
        columns: [
          { header: 'Peringkat', key: 'rank' },
          { header: 'Judul', key: 'title' },
          { header: 'Penulis', key: 'author' },
          { header: 'Jumlah Dipinjam', key: 'count' },
        ],
        rows: rows.map((r, i) => ({ rank: i + 1, title: r.title, author: r.author, count: r.count })),
      };
      filename = 'laporan-buku-terpopuler';
    }

    const buffer = await buildWorkbook([sheet]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.xlsx"`);
    res.send(Buffer.from(buffer));
  })
);
