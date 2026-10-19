import { Response, Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../../utils/api-error';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/audit';
import { hashPassword } from '../../utils/password';

export const settingsRouter = Router();

const SETTINGS_KEYS = [
  'fine_per_day',
  'loan_days',
  'max_loans_siswa',
  'max_loans_guru',
  'reservation_hold_days',
  'library_name',
] as const;

const updateSchema = z.object({
  settings: z
    .array(z.object({ key: z.string(), value: z.string().min(1) }))
    .min(1, 'Tidak ada pengaturan yang dikirim'),
});

// Nilai pengaturan publik untuk frontend (nama perpustakaan)
settingsRouter.get(
  '/public',
  asyncHandler(async (_req, res: Response) => {
    const rows = await prisma.setting.findMany({ where: { key: 'library_name' } });
    res.json({ success: true, data: { library_name: rows[0]?.value ?? 'Perpustakaan Sekolah' } });
  })
);

// Lihat pengaturan (admin & super admin)
settingsRouter.get(
  '/',
  authenticate, authorize('admin', 'super_admin'),
  asyncHandler(async (_req, res: Response) => {
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    res.json({ success: true, data: map });
  })
);

// Ubah pengaturan (hanya super_admin)
settingsRouter.put(
  '/',
  authenticate, authorize('super_admin'),
  validate({ body: updateSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    for (const { key, value } of req.body.settings) {
      if (!(SETTINGS_KEYS as readonly string[]).includes(key)) {
        throw new ApiError(400, `Key pengaturan tidak dikenal: ${key}`);
      }
      if (key !== 'library_name' && (!/^\d+$/.test(value) || parseInt(value, 10) <= 0)) {
        throw new ApiError(400, `Nilai "${key}" harus berupa angka positif`);
      }
      await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    await logActivity(req.user!.userId, 'UPDATE_SETTINGS', 'setting', null);
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    res.json({ success: true, data: map, message: 'Pengaturan berhasil disimpan' });
  })
);

// ---------------- Kelola akun admin (super_admin) ----------------
export const accountsRouter = Router();

const adminSchema = z.object({
  identifier: z.string().trim().min(1, 'NIP wajib diisi').max(30),
  name: z.string().trim().min(1, 'Nama wajib diisi').max(150),
  email: z.string().trim().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  isActive: z.boolean().default(true),
});

accountsRouter.get(
  '/',
  authenticate, authorize('super_admin'),
  asyncHandler(async (_req, res: Response) => {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'super_admin'] } },
      select: { id: true, identifier: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: admins });
  })
);

accountsRouter.post(
  '/',
  authenticate, authorize('super_admin'),
  validate({ body: adminSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const exists = await prisma.user.findUnique({ where: { identifier: req.body.identifier } });
    if (exists) throw new ApiError(409, 'NIP sudah terdaftar');
    const admin = await prisma.user.create({
      data: {
        identifier: req.body.identifier,
        name: req.body.name,
        email: req.body.email || null,
        passwordHash: hashPassword(req.body.password),
        role: 'admin',
        isActive: req.body.isActive,
        classOrPosition: 'Pustakawan',
      },
    });
    await logActivity(req.user!.userId, 'CREATE_ADMIN', 'user', admin.id);
    res.status(201).json({ success: true, message: 'Akun admin berhasil dibuat' });
  })
);

accountsRouter.put(
  '/:id/toggle',
  authenticate, authorize('super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    const admin = await prisma.user.findUnique({ where: { id } });
    if (!admin) throw new ApiError(404, 'Akun tidak ditemukan');
    if (admin.role === 'super_admin') throw new ApiError(403, 'Akun Super Admin tidak dapat dinonaktifkan');
    const updated = await prisma.user.update({ where: { id }, data: { isActive: !admin.isActive } });
    await logActivity(req.user!.userId, 'TOGGLE_ADMIN', 'user', id);
    res.json({ success: true, data: { id: updated.id, isActive: updated.isActive }, message: 'Status akun diperbarui' });
  })
);
