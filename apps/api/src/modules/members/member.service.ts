import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { logActivity } from '../../utils/audit';
import { hashPassword } from '../../utils/password';
import { parsePagination, paginationMeta, prismaSkipTake } from '../../utils/pagination';

export const memberInclude = {
  _count: {
    select: {
      loansBorrowed: { where: { status: { in: ['borrowed', 'overdue'] as any } } },
    },
  },
} satisfies Prisma.UserInclude;

function mapMember(u: Prisma.UserGetPayload<{ include: typeof memberInclude }>) {
  return {
    id: u.id,
    identifier: u.identifier,
    name: u.name,
    email: u.email,
    role: u.role,
    classOrPosition: u.classOrPosition,
    isActive: u.isActive,
    createdAt: u.createdAt,
    activeLoans: u._count.loansBorrowed,
  };
}

export async function listMembers(query: any) {
  const { page, limit } = parsePagination(query, 15);
  const where: Prisma.UserWhereInput = {
    AND: [
      query.role !== 'all' ? { role: query.role as Role } : { role: { in: ['siswa', 'guru', 'admin'] } },
      query.status === 'active' ? { isActive: true } : query.status === 'inactive' ? { isActive: false } : {},
      query.q
        ? {
            OR: [
              { name: { contains: query.q } },
              { identifier: { contains: query.q } },
              { email: { contains: query.q } },
            ],
          }
        : {},
    ],
  };
  const { skip, take } = prismaSkipTake(page, limit);
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, include: memberInclude, orderBy: { name: 'asc' }, skip, take }),
    prisma.user.count({ where }),
  ]);
  return { data: users.map(mapMember), meta: paginationMeta(total, page, limit) };
}

export async function createMember(data: any, actorId: number, actorRole: Role) {
  if (data.role === 'admin' && actorRole !== 'super_admin') {
    throw new ApiError(403, 'Hanya Super Admin yang dapat membuat akun admin');
  }
  const exists = await prisma.user.findUnique({ where: { identifier: data.identifier } });
  if (exists) throw new ApiError(409, `NIS/NIP "${data.identifier}" sudah terdaftar`);
  if (data.email) {
    const emailExists = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailExists) throw new ApiError(409, `Email "${data.email}" sudah terdaftar`);
  }
  const user = await prisma.user.create({
    data: {
      identifier: data.identifier,
      name: data.name,
      email: data.email || null,
      passwordHash: hashPassword(data.password),
      role: data.role,
      classOrPosition: data.classOrPosition || null,
      isActive: data.isActive ?? true,
    },
  });
  await logActivity(actorId, 'CREATE_MEMBER', 'user', user.id);
  return mapMember({ ...user, _count: { loansBorrowed: 0 } } as any);
}

export async function updateMember(id: number, data: any, actorId: number, actorRole: Role) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'Anggota tidak ditemukan');
  if (user.role === 'super_admin' && actorRole !== 'super_admin') {
    throw new ApiError(403, 'Tidak diizinkan mengubah akun Super Admin');
  }
  if (data.role === 'admin' && actorRole !== 'super_admin') {
    throw new ApiError(403, 'Hanya Super Admin yang dapat menetapkan role admin');
  }
  if (data.email) {
    const emailExists = await prisma.user.findFirst({ where: { email: data.email, id: { not: id } } });
    if (emailExists) throw new ApiError(409, `Email "${data.email}" sudah dipakai anggota lain`);
  }
  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: data.name ?? user.name,
      email: data.email === undefined ? user.email : data.email || null,
      role: data.role ?? user.role,
      classOrPosition: data.classOrPosition === undefined ? user.classOrPosition : data.classOrPosition || null,
      isActive: data.isActive ?? user.isActive,
    },
  });
  await logActivity(actorId, 'UPDATE_MEMBER', 'user', id);
  return updated;
}

export async function resetMemberPassword(id: number, newPassword: string, actorId: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'Anggota tidak ditemukan');
  await prisma.user.update({ where: { id }, data: { passwordHash: hashPassword(newPassword) } });
  await logActivity(actorId, 'RESET_PASSWORD', 'user', id);
}

/** Nonaktifkan (soft delete) — riwayat pinjam & denda tetap tersimpan. */
export async function deactivateMember(id: number, actorId: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'Anggota tidak ditemukan');
  if (user.role === 'super_admin') throw new ApiError(403, 'Akun Super Admin tidak dapat dinonaktifkan');
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await logActivity(actorId, 'DEACTIVATE_MEMBER', 'user', id);
}

// ---------------- Import massal (FR-15) ----------------
export interface ImportRow {
  identifier: string;
  name: string;
  email?: string;
  role: 'siswa' | 'guru';
  classOrPosition?: string;
  password?: string;
}

export async function importMembers(rows: ImportRow[], actorId: number) {
  let created = 0;
  let updated = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.identifier || !row.name) {
        errors.push({ row: i + 2, message: 'identifier & name wajib diisi' });
        continue;
      }
      const role = (row.role || 'siswa').toLowerCase();
      if (role !== 'siswa' && role !== 'guru') {
        errors.push({ row: i + 2, message: `role "${row.role}" tidak valid (gunakan siswa/guru)` });
        continue;
      }
      const existing = await prisma.user.findUnique({ where: { identifier: row.identifier } });
      const payload = {
        name: row.name,
        email: row.email || null,
        role: role as Role,
        classOrPosition: row.classOrPosition || null,
      };
      if (existing) {
        await prisma.user.update({ where: { identifier: row.identifier }, data: payload });
        updated++;
      } else {
        await prisma.user.create({
          data: {
            identifier: row.identifier,
            passwordHash: hashPassword(row.password || 'sipus123'),
            ...payload,
          },
        });
        created++;
      }
    } catch (e: any) {
      errors.push({ row: i + 2, message: e?.message || 'Gagal memproses baris' });
    }
  }
  await logActivity(actorId, 'IMPORT_MEMBERS', 'user', null);
  return { total: rows.length, created, updated, errors };
}
