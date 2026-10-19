import { Prisma, CopyStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { logActivity } from '../../utils/audit';
import { parsePagination, paginationMeta, prismaSkipTake } from '../../utils/pagination';

const bookInclude = {
  category: true,
  _count: {
    select: {
      copies: { where: { status: CopyStatus.available } },
    },
  },
} satisfies Prisma.BookInclude;

function mapBook(
  book: Prisma.BookGetPayload<{ include: typeof bookInclude }>,
  totalCopies?: number
) {
  return {
    ...book,
    availableCopies: book._count.copies,
    totalCopies: totalCopies ?? book._count.copies,
    _count: undefined,
  };
}

export async function listBooks(query: any) {
  const { page, limit } = parsePagination(query);
  const { q, categoryId, status, sort } = query;

  const where: Prisma.BookWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { title: { contains: q } },
              { author: { contains: q } },
              { isbn: { contains: q } },
              { publisher: { contains: q } },
            ],
          }
        : {},
      categoryId ? { categoryId } : {},
      status === 'available' ? { copies: { some: { status: CopyStatus.available } } } : {},
      status === 'unavailable'
        ? { NOT: { copies: { some: { status: CopyStatus.available } } } }
        : {},
    ],
  };

  const orderBy: Prisma.BookOrderByWithRelationInput =
    sort === 'title' ? { title: 'asc' } : sort === 'year' ? { publishYear: 'desc' } : { createdAt: 'desc' };

  const { skip, take } = prismaSkipTake(page, limit);
  const [books, total] = await Promise.all([
    prisma.book.findMany({ where, orderBy, skip, take, include: bookInclude }),
    prisma.book.count({ where }),
  ]);

  // jumlah total eksemplar per buku pada halaman ini
  const copyCounts = await prisma.bookCopy.groupBy({
    by: ['bookId'],
    where: { bookId: { in: books.map((b) => b.id) } },
    _count: { _all: true },
  });
  const countMap = new Map(copyCounts.map((c) => [c.bookId, c._count._all]));

  return {
    data: books.map((b) => mapBook(b, countMap.get(b.id) ?? 0)),
    meta: paginationMeta(total, page, limit),
  };
}

export async function getBook(id: number) {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      category: true,
      copies: { orderBy: { inventoryCode: 'asc' } },
    },
  });
  if (!book) throw new ApiError(404, 'Buku tidak ditemukan');
  return book;
}

function cleanBookData(data: any) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === '') out[k] = null;
    else out[k] = v;
  }
  return out as any;
}

export async function createBook(data: any, actorId: number) {
  const book = await prisma.book.create({ data: cleanBookData(data) });
  await logActivity(actorId, 'CREATE_BOOK', 'book', book.id);
  return book;
}

export async function updateBook(id: number, data: any, actorId: number) {
  await prisma.book.findUniqueOrThrow({ where: { id } });
  const book = await prisma.book.update({ where: { id }, data: cleanBookData(data) });
  await logActivity(actorId, 'UPDATE_BOOK', 'book', id);
  return book;
}

export async function deleteBook(id: number, actorId: number) {
  const book = await prisma.book.findUnique({ where: { id }, include: { copies: true } });
  if (!book) throw new ApiError(404, 'Buku tidak ditemukan');
  const hasActiveLoan = book.copies.some((c) => c.status === CopyStatus.borrowed);
  if (hasActiveLoan) {
    throw new ApiError(409, 'Buku tidak dapat dihapus karena masih ada eksemplar yang sedang dipinjam');
  }
  await prisma.book.delete({ where: { id } });
  await logActivity(actorId, 'DELETE_BOOK', 'book', id);
}

export async function addCopy(bookId: number, data: { inventoryCode: string; shelfLocation?: string }, actorId: number) {
  await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  const copy = await prisma.bookCopy.create({
    data: { bookId, inventoryCode: data.inventoryCode, shelfLocation: data.shelfLocation || null },
  });
  await logActivity(actorId, 'ADD_BOOK_COPY', 'book_copy', copy.id);
  return copy;
}

export async function updateCopy(copyId: number, data: { shelfLocation?: string; status?: CopyStatus }, actorId: number) {
  const copy = await prisma.bookCopy.findUnique({ where: { id: copyId } });
  if (!copy) throw new ApiError(404, 'Eksemplar tidak ditemukan');
  if (data.status && copy.status === CopyStatus.borrowed && data.status !== CopyStatus.borrowed) {
    const activeLoan = await prisma.loan.findFirst({
      where: { bookCopyId: copyId, status: { in: ['borrowed', 'overdue'] } },
    });
    if (activeLoan) {
      throw new ApiError(409, 'Eksemplar sedang dipinjam — proses pengembalian terlebih dahulu');
    }
  }
  const updated = await prisma.bookCopy.update({ where: { id: copyId }, data });
  await logActivity(actorId, 'UPDATE_BOOK_COPY', 'book_copy', copyId);
  return updated;
}

export async function deleteCopy(copyId: number, actorId: number) {
  const copy = await prisma.bookCopy.findUnique({ where: { id: copyId } });
  if (!copy) throw new ApiError(404, 'Eksemplar tidak ditemukan');
  if (copy.status === CopyStatus.borrowed) {
    const activeLoan = await prisma.loan.findFirst({
      where: { bookCopyId: copyId, status: { in: ['borrowed', 'overdue'] } },
    });
    if (activeLoan) {
      throw new ApiError(409, 'Eksemplar sedang dipinjam dan tidak dapat dihapus');
    }
  }
  await prisma.bookCopy.delete({ where: { id: copyId } });
  await logActivity(actorId, 'DELETE_BOOK_COPY', 'book_copy', copyId);
}

/** Lookup eksemplar berdasarkan kode inventaris/barcode — untuk meja sirkulasi. */
export async function lookupCopy(code: string) {
  const copy = await prisma.bookCopy.findUnique({
    where: { inventoryCode: code },
    include: {
      book: { include: { category: true } },
      loans: {
        where: { status: { in: ['borrowed', 'overdue'] } },
        include: { user: true },
        take: 1,
        orderBy: { loanDate: 'desc' },
      },
    },
  });
  if (!copy) throw new ApiError(404, 'Kode inventaris tidak ditemukan');
  const activeLoan = copy.loans[0] ?? null;
  return {
    copy: { id: copy.id, inventoryCode: copy.inventoryCode, shelfLocation: copy.shelfLocation, status: copy.status },
    book: copy.book,
    activeLoan: activeLoan
      ? {
          id: activeLoan.id,
          loanDate: activeLoan.loanDate,
          dueDate: activeLoan.dueDate,
          user: { id: activeLoan.user.id, identifier: activeLoan.user.identifier, name: activeLoan.user.name, classOrPosition: activeLoan.user.classOrPosition },
        }
      : null,
  };
}

// ---------------- Categories ----------------
export async function listCategories() {
  const cats = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { books: true } } },
  });
  return cats.map((c) => ({ id: c.id, name: c.name, description: c.description, bookCount: c._count.books }));
}

export async function createCategory(data: { name: string; description?: string }) {
  return prisma.category.create({ data });
}

export async function updateCategory(id: number, data: { name?: string; description?: string }) {
  await prisma.category.findUniqueOrThrow({ where: { id } });
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: number) {
  const count = await prisma.book.count({ where: { categoryId: id } });
  if (count > 0) throw new ApiError(409, `Kategori masih dipakai oleh ${count} buku`);
  await prisma.category.delete({ where: { id } });
}
