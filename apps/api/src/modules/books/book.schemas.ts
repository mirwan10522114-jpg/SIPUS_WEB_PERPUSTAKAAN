import { z } from 'zod';
import { CopyStatus } from '@prisma/client';

export const bookQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  status: z.enum(['available', 'unavailable']).optional(),
  sort: z.enum(['newest', 'title', 'year']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export const createBookSchema = z.object({
  isbn: z.string().trim().max(20).optional().or(z.literal('')),
  title: z.string().trim().min(1, 'Judul buku wajib diisi').max(255),
  author: z.string().trim().min(1, 'Penulis wajib diisi').max(255),
  publisher: z.string().trim().max(255).optional().or(z.literal('')),
  publishYear: z.coerce.number().int().min(1800).max(2100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  coverImageUrl: z.string().trim().max(500).optional().or(z.literal('')),
});

export const updateBookSchema = createBookSchema.partial();

export const createCopySchema = z.object({
  inventoryCode: z.string().trim().min(1, 'Kode inventaris wajib diisi').max(50),
  shelfLocation: z.string().trim().max(100).optional().or(z.literal('')),
});

export const updateCopySchema = z.object({
  shelfLocation: z.string().trim().max(100).optional(),
  status: z.nativeEnum(CopyStatus).optional(),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
