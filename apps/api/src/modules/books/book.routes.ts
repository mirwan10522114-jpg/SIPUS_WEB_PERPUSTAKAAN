import { Response, Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { asyncHandler, ApiError } from '../../utils/api-error';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import {
  bookQuerySchema, createBookSchema, updateBookSchema, createCopySchema, updateCopySchema, idParamSchema,
} from './book.schemas';
import {
  listBooks, getBook, createBook, updateBook, deleteBook,
  addCopy, updateCopy, deleteCopy, lookupCopy,
  listCategories, createCategory, updateCategory, deleteCategory,
} from './book.service';

export const booksRouter = Router();
export const categoriesRouter = Router();

// ---------------- Public ----------------
booksRouter.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const query = bookQuerySchema.parse(req.query);
    const result = await listBooks(query);
    res.json({ success: true, ...result });
  })
);

booksRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res: Response) => {
    const book = await getBook((req.params as any).id);
    res.json({ success: true, data: book });
  })
);

// Lookup barcode (admin — meja sirkulasi)
booksRouter.get(
  '/copies/lookup/:code',
  authenticate, authorize('admin', 'super_admin'),
  asyncHandler(async (req, res: Response) => {
    const result = await lookupCopy(String(req.params.code).trim());
    res.json({ success: true, data: result });
  })
);

// ---------------- Admin CRUD ----------------
booksRouter.post(
  '/',
  authenticate, authorize('admin', 'super_admin'),
  validate({ body: createBookSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const book = await createBook(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: book, message: 'Buku berhasil ditambahkan' });
  })
);

booksRouter.put(
  '/:id',
  authenticate, authorize('admin', 'super_admin'),
  validate({ params: idParamSchema, body: updateBookSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const book = await updateBook((req.params as any).id, req.body, req.user!.userId);
    res.json({ success: true, data: book, message: 'Buku berhasil diperbarui' });
  })
);

booksRouter.delete(
  '/:id',
  authenticate, authorize('admin', 'super_admin'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await deleteBook((req.params as any).id, req.user!.userId);
    res.json({ success: true, message: 'Buku berhasil dihapus' });
  })
);

// ---------------- Copies (eksemplar) ----------------
booksRouter.post(
  '/:id/copies',
  authenticate, authorize('admin', 'super_admin'),
  validate({ params: idParamSchema, body: createCopySchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const copy = await addCopy((req.params as any).id, req.body, req.user!.userId);
    res.status(201).json({ success: true, data: copy, message: 'Eksemplar berhasil ditambahkan' });
  })
);

booksRouter.put(
  '/copies/:id',
  authenticate, authorize('admin', 'super_admin'),
  validate({ params: idParamSchema, body: updateCopySchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const copy = await updateCopy((req.params as any).id, req.body, req.user!.userId);
    res.json({ success: true, data: copy, message: 'Eksemplar berhasil diperbarui' });
  })
);

booksRouter.delete(
  '/copies/:id',
  authenticate, authorize('admin', 'super_admin'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await deleteCopy((req.params as any).id, req.user!.userId);
    res.json({ success: true, message: 'Eksemplar berhasil dihapus' });
  })
);

// ---------------- Categories ----------------
categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res: Response) => {
    const cats = await listCategories();
    res.json({ success: true, data: cats });
  })
);

categoriesRouter.post(
  '/',
  authenticate, authorize('admin', 'super_admin'),
  validate({ body: z.object({ name: z.string().trim().min(1, 'Nama kategori wajib diisi').max(100), description: z.string().trim().max(500).optional() }) }),
  asyncHandler(async (req, res: Response) => {
    const cat = await createCategory(req.body);
    res.status(201).json({ success: true, data: cat, message: 'Kategori berhasil ditambahkan' });
  })
);

categoriesRouter.put(
  '/:id',
  authenticate, authorize('admin', 'super_admin'),
  validate({ params: idParamSchema, body: z.object({ name: z.string().trim().min(1).max(100).optional(), description: z.string().trim().max(500).optional() }) }),
  asyncHandler(async (req, res: Response) => {
    const cat = await updateCategory((req.params as any).id, req.body);
    res.json({ success: true, data: cat, message: 'Kategori berhasil diperbarui' });
  })
);

categoriesRouter.delete(
  '/:id',
  authenticate, authorize('admin', 'super_admin'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res: Response) => {
    await deleteCategory((req.params as any).id);
    res.json({ success: true, message: 'Kategori berhasil dihapus' });
  })
);

// ---------------- Upload cover buku (FR-10) ----------------
const uploadsDir = path.resolve(__dirname, '../../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const coverUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `cover-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, 'File harus berupa gambar (JPG/PNG/WebP/GIF)'));
  },
});

export const uploadsRouter = Router();

uploadsRouter.post(
  '/',
  authenticate, authorize('admin', 'super_admin'),
  coverUpload.single('file'),
  asyncHandler(async (req, res: Response) => {
    if (!req.file) throw new ApiError(400, 'File gambar wajib diunggah (field: file)');
    res.json({ success: true, data: { url: `/uploads/${req.file.filename}` }, message: 'Gambar berhasil diunggah' });
  })
);
