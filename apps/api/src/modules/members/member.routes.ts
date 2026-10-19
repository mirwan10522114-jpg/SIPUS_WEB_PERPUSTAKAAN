import { Response, Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { asyncHandler, ApiError } from '../../utils/api-error';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import {
  createMemberSchema, updateMemberSchema, memberQuerySchema, resetPasswordSchema, idParam as idParamSchema,
} from './member.schemas';
import {
  listMembers, createMember, updateMember, resetMemberPassword, deactivateMember, importMembers,
  ImportRow,
} from './member.service';

export const membersRouter = Router();
membersRouter.use(authenticate, authorize('admin', 'super_admin'));

membersRouter.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const query = memberQuerySchema.parse(req.query);
    const result = await listMembers(query);
    res.json({ success: true, ...result });
  })
);

membersRouter.post(
  '/',
  validate({ body: createMemberSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const member = await createMember(req.body, req.user!.userId, req.user!.role);
    res.status(201).json({ success: true, data: member, message: 'Anggota berhasil ditambahkan' });
  })
);

membersRouter.put(
  '/:id',
  validate({ params: idParamSchema, body: updateMemberSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const member = await updateMember((req.params as any).id, req.body, req.user!.userId, req.user!.role);
    res.json({ success: true, data: member, message: 'Data anggota berhasil diperbarui' });
  })
);

membersRouter.put(
  '/:id/reset-password',
  validate({ params: idParamSchema, body: resetPasswordSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await resetMemberPassword((req.params as any).id, req.body.newPassword, req.user!.userId);
    res.json({ success: true, message: 'Password anggota berhasil direset' });
  })
);

membersRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await deactivateMember((req.params as any).id, req.user!.userId);
    res.json({ success: true, message: 'Anggota berhasil dinonaktifkan (riwayat transaksi tetap tersimpan)' });
  })
);

// ---------------- Import massal via Excel/CSV (FR-15) ----------------
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['.csv', '.xlsx'].includes(
      require('path').extname(file.originalname).toLowerCase()
    );
    if (ok) cb(null, true);
    else cb(new ApiError(400, 'File harus .csv atau .xlsx'));
  },
});

const IMPORT_COLUMNS: Record<string, string> = {
  identifier: 'identifier',
  nis: 'identifier',
  nip: 'identifier',
  name: 'name',
  nama: 'name',
  email: 'email',
  role: 'role',
  peran: 'role',
  class_or_position: 'classOrPosition',
  kelas: 'classOrPosition',
  jabatan: 'classOrPosition',
  password: 'password',
};

membersRouter.post(
  '/import',
  importUpload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) throw new ApiError(400, 'File wajib diunggah (field: file)');
    const ExcelJS = await import('exceljs');
    const name = req.file.originalname.toLowerCase();

    type Row = Record<string, string>;
    let parsedRows: Row[] = [];

    if (name.endsWith('.csv')) {
      parsedRows = parseCsv(req.file.buffer.toString('utf8').replace(/^\uFEFF/, ''));
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer as any);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new ApiError(400, 'File kosong atau tidak dapat dibaca');
      parsedRows = sheetToRows(sheet);
    }

    // Petakan header (label Indonesia/Inggris) → field internal
    const rows: ImportRow[] = [];
    for (const r of parsedRows) {
      const item: any = {};
      for (const [rawKey, value] of Object.entries(r)) {
        const key = rawKey.trim().toLowerCase().replace(/\s+/g, '_');
        const field = IMPORT_COLUMNS[key];
        if (field && value) item[field] = value;
      }
      if (Object.values(item).some((v) => v)) rows.push(item as ImportRow);
    }

    if (rows.length === 0) throw new ApiError(400, 'Tidak ada baris data yang terbaca dari file');
    const result = await importMembers(rows, req.user!.userId);
    res.json({ success: true, data: result, message: `Import selesai: ${result.created} dibuat, ${result.updated} diperbarui` });
  })
);

/** Parser CSV sederhana dengan dukungan tanda kutip & koma di dalam nilai. */
function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',' || ch === ';' || ch === '\t') {
      cur.push(field); field = '';
    } else if (ch === '\r') {
      // abaikan
    } else if (ch === '\n') {
      cur.push(field); field = '';
      rows.push(cur); cur = [];
    } else {
      field += ch;
    }
  }
  cur.push(field);
  rows.push(cur);

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim()));
  if (nonEmpty.length === 0) return [];
  const headers = nonEmpty[0];
  return nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
    return obj;
  });
}

/** Konversi sheet ExcelJS menjadi array object berdasarkan baris pertama (header). */
function sheetToRows(sheet: import('exceljs').Worksheet): Array<Record<string, string>> {
  const out: Array<Record<string, string>> = [];
  let headers: string[] = [];
  sheet.eachRow((row, rowNumber) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      let value: any = cell.value;
      if (value && typeof value === 'object' && 'text' in value) value = (value as any).text;
      else if (value && typeof value === 'object' && 'result' in value) value = (value as any).result;
      else if (value instanceof Date) value = value.toISOString().slice(0, 10);
      cells.push(value != null ? String(value).trim() : '');
    });
    if (rowNumber === 1) { headers = cells; return; }
    if (!cells.some((c) => c)) return;
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    out.push(obj);
  });
  return out;
}
