import { z } from 'zod';

export const createLoanSchema = z
  .object({
    userId: z.coerce.number().int().positive().optional(),
    userIdentifier: z.string().trim().min(1).optional(),
    copyId: z.coerce.number().int().positive().optional(),
    copyCode: z.string().trim().min(1).optional(),
    loanDays: z.coerce.number().int().min(1).max(90).optional(),
  })
  .refine((d) => d.userId || d.userIdentifier, { message: 'Anggota wajib diisi (userId atau userIdentifier)' })
  .refine((d) => d.copyId || d.copyCode, { message: 'Eksemplar wajib diisi (copyId atau copyCode)' });

export const returnByCodeSchema = z.object({
  copyCode: z.string().trim().min(1, 'Kode inventaris eksemplar wajib diisi'),
});

export const loanQuerySchema = z.object({
  status: z.enum(['active', 'borrowed', 'overdue', 'returned', 'lost', 'all']).default('all'),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
});
