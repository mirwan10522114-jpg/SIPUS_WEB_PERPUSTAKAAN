import { z } from 'zod';

export const createMemberSchema = z.object({
  identifier: z.string().trim().min(1, 'NIS/NIP wajib diisi').max(30),
  name: z.string().trim().min(1, 'Nama wajib diisi').max(150),
  email: z.string().trim().email('Format email tidak valid').optional().or(z.literal('')),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['siswa', 'guru', 'admin']),
  classOrPosition: z.string().trim().max(100).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const updateMemberSchema = createMemberSchema
  .omit({ password: true })
  .partial()
  .extend({ newStatus: z.boolean().optional() });

export const memberQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['siswa', 'guru', 'admin', 'all']).default('all'),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
});

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
});
