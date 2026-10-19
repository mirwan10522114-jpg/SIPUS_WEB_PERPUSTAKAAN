import { Response, Router } from 'express';
import { asyncHandler, ApiError } from '../../utils/api-error';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import { createLoanSchema, returnByCodeSchema, loanQuerySchema } from './loan.schemas';
import { createLoan, returnLoan, listLoans, myLoans } from './loan.service';

export const loansRouter = Router();

loansRouter.use(authenticate);

// Riwayat peminjaman milik sendiri (siswa/guru)
loansRouter.get(
  '/me',
  authorize('siswa', 'guru', 'admin', 'super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const loans = await myLoans(req.user!.userId, status);
    res.json({ success: true, data: loans });
  })
);

// List semua peminjaman (admin)
loansRouter.get(
  '/',
  authorize('admin', 'super_admin'),
  asyncHandler(async (req, res: Response) => {
    const query = loanQuerySchema.parse(req.query);
    const result = await listLoans(query);
    res.json({ success: true, ...result });
  })
);

// Catat peminjaman baru (admin)
loansRouter.post(
  '/',
  authorize('admin', 'super_admin'),
  validate({ body: createLoanSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const loan = await createLoan(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: loan, message: 'Peminjaman berhasil dicatat' });
  })
);

// Proses pengembalian via kode inventaris (admin — scan barcode)
loansRouter.put(
  '/return-by-code',
  authorize('admin', 'super_admin'),
  validate({ body: returnByCodeSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await returnLoan({ copyCode: req.body.copyCode }, req.user!.userId);
    res.json({
      success: true,
      data: result,
      message: result.fine
        ? `Pengembalian dicatat. Denda keterlambatan Rp${Number(result.fine.amount).toLocaleString('id-ID')} diterbitkan.`
        : 'Pengembalian berhasil dicatat',
    });
  })
);

// Proses pengembalian via ID loan (admin)
loansRouter.put(
  '/:id/return',
  authorize('admin', 'super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) throw new ApiError(400, 'ID peminjaman tidak valid');
    const result = await returnLoan({ loanId: id }, req.user!.userId);
    res.json({
      success: true,
      data: result,
      message: result.fine
        ? `Pengembalian dicatat. Denda keterlambatan Rp${Number(result.fine.amount).toLocaleString('id-ID')} diterbitkan.`
        : 'Pengembalian berhasil dicatat',
    });
  })
);
