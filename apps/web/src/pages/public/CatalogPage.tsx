import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../../api/client';
import type { Book, Category, PaginationMeta } from '../../api/types';
import { BookCard } from '../../components/BookCard';
import { Pagination, Select, Spinner, EmptyState, Input } from '../../components/ui/ui';

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const q = params.get('q') ?? '';
  const categoryId = params.get('categoryId') ?? '';
  const status = params.get('status') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const page = parseInt(params.get('page') ?? '1', 10);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const query: Record<string, string | number> = { page, limit: 12, sort };
    if (q) query.q = q;
    if (categoryId) query.categoryId = categoryId;
    if (status) query.status = status;
    api
      .get('/books', { params: query })
      .then((res) => {
        setBooks(res.data.data);
        setMeta(res.data.meta);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q, categoryId, status, sort, page]);

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      });
      if (!('page' in patch)) next.delete('page');
      setParams(next);
    },
    [params, setParams]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-900 sm:text-3xl">Katalog Buku</h1>
        <p className="mt-1 text-sm text-stone-500">
          {meta ? `${meta.total} judul buku ditemukan` : 'Mencari koleksi…'} — cari berdasarkan judul, penulis, ISBN, atau kategori.
        </p>
      </header>

      {/* Filter & pencarian */}
      <div className="mb-6 space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const val = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value;
            update({ q: val });
          }}
        >
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input name="q" defaultValue={q} placeholder="Cari judul / penulis / ISBN…" className="pl-10" />
          </div>
          <button className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white transition hover:bg-brand-800">
            Cari
          </button>
        </form>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <div className="col-span-1 flex items-center gap-2 text-sm text-stone-500 sm:contents">
            <SlidersHorizontal size={16} className="shrink-0 sm:hidden" />
          </div>
          <Select value={categoryId} onChange={(e) => update({ categoryId: e.target.value })} className="sm:w-52">
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.bookCount != null ? `(${c.bookCount})` : ''}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => update({ status: e.target.value })} className="sm:w-44">
            <option value="">Semua Status</option>
            <option value="available">Tersedia</option>
            <option value="unavailable">Sedang Dipinjam Semua</option>
          </Select>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value })} className="sm:w-44">
            <option value="newest">Terbaru</option>
            <option value="title">Judul A–Z</option>
            <option value="year">Tahun Terbaru</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : books.length === 0 ? (
        <EmptyState
          title="Buku tidak ditemukan"
          description="Coba kata kunci lain atau hapus filter yang aktif."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {books.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
          {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onChange={(p) => update({ page: String(p) })} />}
        </>
      )}
    </div>
  );
}
