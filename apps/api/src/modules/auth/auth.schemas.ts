import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'NIS/NIP wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
});
