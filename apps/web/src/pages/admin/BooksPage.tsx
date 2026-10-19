import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Layers, ImagePlus, Search, QrCode } from 'lucide-react';
import { api, errMessage } from '../../api/client';
import type { Book, BookCopy, Category, PaginationMeta } from '../../api/types';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Pagination, Select, Spinner, Textarea } from '../../components/ui/ui';
import { useToast } from '../../components/ui/Toast';
import { STATUS_COPY } from '../../utils/format';
import { copyQrValue, makeQrDataUrl, printQrLabels } from '../../utils/qr';

const EMPTY_FORM = {
  title: '', author: '', isbn: '', publisher: '', publishYear: '', categoryId: '', description: '', coverImageUrl: '',
};

export function BooksPage() {
  const toast = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [copiesBook, setCopiesBook] = useState<Book | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 12 };
    if (q) params.q = q;
    if (categoryId) params.categoryId = categoryId;
    api
      .get('/books', { params })
      .then((res) => {
        setBooks(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((e) => toast('error', errMessage(e)))
      .finally(() => setLoading(false));
  }, [page, q, categoryId]);

  useEffect(load, [load]);
  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
  };

  const openEdit = (book: Book) => {
    setEditing(book);
    setForm({
      title: book.title, author: book.author, isbn: book.isbn ?? '', publisher: book.publisher ?? '',
      publishYear: book.publishYear?.toString() ?? '', categoryId: book.categoryId?.toString() ?? '',
      description: book.description ?? '', coverImageUrl: book.coverImageUrl ?? '',
    });
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title, author: form.author,
      isbn: form.isbn || undefined, publisher: form.publisher || undefined,
      description: form.description || undefined, coverImageUrl: form.coverImageUrl || undefined,
      publishYear: form.publishYear ? parseInt(form.publishYear, 10) : undefined,
      categoryId: form.categoryId ? parseInt(form.categoryId, 10) : undefined,
    };
    try {
      if (editing) await api.put(`/books/${editing.id}`, payload);
      else await api.post('/books', payload);
      toast('success', editing ? 'Buku berhasil diperbarui' : 'Buku berhasil ditambahkan');
      setFormOpen(false);
      load();
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/uploads', fd);
      setForm((f) => ({ ...f, coverImageUrl: res.data.data.url }));
      toast('success', 'Cover terunggah');
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (book: Book) => {
    if (!confirm(`Hapus buku "${book.title}" beserta semua eksemplarnya?`)) return;
    try {
      await api.delete(`/books/${book.id}`);
      toast('success', 'Buku berhasil dihapus');
      load();
    } catch (e) {
      toast('error', errMessage(e));
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Manajemen Buku</h1>
          <p className="mt-1 text-sm text-stone-500">Kelola katalog, kategori, dan eksemplar fisik (FR-06, FR-07).</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Tambah Buku
        </Button>
      </header>

      <Card className="flex flex-col gap-2 p-4 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}
        >
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul / penulis / ISBN…" className="pl-10" />
        </form>
        <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="sm:w-56">
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Card>

      {loading ? (
        <Spinner />
      ) : books.length === 0 ? (
        <EmptyState title="Buku tidak ditemukan" description="Tambahkan buku pertama atau ubah filter." />
      ) : (
        <>
          {/* Desktop: tabel */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-3 font-semibold">Buku</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Tahun</th>
                  <th className="px-4 py-3 font-semibold">Tersedia</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {books.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-stone-900">{b.title}</p>
                      <p className="text-xs text-stone-500">{b.author} · {b.isbn ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{b.category?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-stone-600">{b.publishYear ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${(b.availableCopies ?? 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {b.availableCopies ?? 0}
                      </span>
                      <span className="text-stone-400"> / {_countCopies(b)} eksemplar</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => setCopiesBook(b)}>
                          <Layers size={14} /> Eksemplar
                        </Button>
                        <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => openEdit(b)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="danger" className="px-3 py-2 text-xs" onClick={() => remove(b)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile: kartu (FR-33) */}
          <div className="space-y-3 md:hidden">
            {books.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900">{b.title}</p>
                    <p className="text-xs text-stone-500">{b.author}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      {b.category?.name ?? '-'} · {b.publishYear ?? '-'} ·{' '}
                      <span className={(b.availableCopies ?? 0) > 0 ? 'font-bold text-emerald-600' : 'font-bold text-red-500'}>
                        {b.availableCopies ?? 0}/{_countCopies(b)} tersedia
                      </span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                  <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => setCopiesBook(b)}>
                    <Layers size={14} /> Eksemplar
                  </Button>
                  <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => openEdit(b)}>
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button variant="danger" className="px-3 py-2 text-xs" onClick={() => remove(b)}>
                    <Trash2 size={14} /> Hapus
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />}
        </>
      )}

      {/* Form buku */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Buku' : 'Tambah Buku'} wide>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Judul" required>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </Field>
            </div>
            <Field label="Penulis" required>
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} required />
            </Field>
            <Field label="ISBN">
              <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
            </Field>
            <Field label="Penerbit">
              <Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
            </Field>
            <Field label="Tahun Terbit">
              <Input type="number" min={1800} max={2100} value={form.publishYear} onChange={(e) => setForm({ ...form, publishYear: e.target.value })} />
            </Field>
            <Field label="Kategori">
              <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">— Pilih kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Cover Buku" hint="JPG/PNG/WebP maks 2MB (FR-10)">
              <div className="flex items-center gap-3">
                {form.coverImageUrl && (
                  <img src={form.coverImageUrl} alt="cover" className="h-16 w-12 rounded-lg object-cover" loading="lazy" />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
                />
                <Button type="button" variant="outline" loading={uploading} onClick={() => fileRef.current?.click()}>
                  <ImagePlus size={16} /> Unggah
                </Button>
              </div>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Deskripsi / Sinopsis">
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}>{editing ? 'Simpan Perubahan' : 'Tambah Buku'}</Button>
          </div>
        </form>
      </Modal>

      {copiesBook && <CopiesModal book={copiesBook} onClose={() => setCopiesBook(null)} />}
    </div>
  );
}

function _countCopies(book: Book): number {
  return book.totalCopies ?? book._count?.copies ?? book.copies?.length ?? 0;
}

// ---------------- Kelola eksemplar (FR-07, FR-09) ----------------
function CopiesModal({ book, onClose }: { book: Book; onClose: () => void }) {
  const toast = useToast();
  const [copies, setCopies] = useState<BookCopy[]>(book.copies ?? []);
  const [code, setCode] = useState('');
  const [shelf, setShelf] = useState('');
  const [adding, setAdding] = useState(false);
  const [printing, setPrinting] = useState(false);

  const printLabels = async () => {
    setPrinting(true);
    try {
      const items = await Promise.all(
        copies.map(async (c) => ({
          title: book.title,
          subtitle: `${c.inventoryCode}${c.shelfLocation ? ` · ${c.shelfLocation}` : ''}`,
          qrDataUrl: await makeQrDataUrl(copyQrValue(c.inventoryCode)),
        }))
      );
      await printQrLabels(items, `Label QR Eksemplar — ${book.title}`);
    } catch (e: any) {
      toast('error', e?.message ?? 'Gagal membuka jendela cetak');
    } finally {
      setPrinting(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post(`/books/${book.id}/copies`, { inventoryCode: code.trim(), shelfLocation: shelf || undefined });
      toast('success', 'Eksemplar ditambahkan');
      setCode('');
      setShelf('');
      const res = await api.get(`/books/${book.id}`);
      setCopies(res.data.data.copies);
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setAdding(false);
    }
  };

  const changeStatus = async (copy: BookCopy, status: string) => {
    try {
      await api.put(`/books/copies/${copy.id}`, { status });
      toast('success', 'Status eksemplar diperbarui');
      setCopies((prev) => prev.map((c) => (c.id === copy.id ? { ...c, status: status as BookCopy['status'] } : c)));
    } catch (e) {
      toast('error', errMessage(e));
    }
  };

  const remove = async (copy: BookCopy) => {
    if (!confirm(`Hapus eksemplar ${copy.inventoryCode}?`)) return;
    try {
      await api.delete(`/books/copies/${copy.id}`);
      toast('success', 'Eksemplar dihapus');
      setCopies((prev) => prev.filter((c) => c.id !== copy.id));
    } catch (e) {
      toast('error', errMessage(e));
    }
  };

  return (
    <Modal open onClose={onClose} title={`Eksemplar — ${book.title}`} wide>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-stone-500">
          Tempel label QR ini di sampul buku — discan di halaman Sirkulasi saat pinjam/kembali.
        </p>
        <Button variant="outline" className="px-3 py-2 text-xs" loading={printing} onClick={printLabels} disabled={copies.length === 0}>
          <QrCode size={13} /> Cetak Semua Label QR
        </Button>
      </div>
      <form onSubmit={add} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kode inventaris / barcode" required />
        <Input value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="Lokasi rak (opsional)" className="sm:w-48" />
        <Button type="submit" loading={adding} className="shrink-0 px-4">
          <Plus size={16} /> Tambah
        </Button>
      </form>
      <ul className="divide-y divide-stone-100">
        {copies.map((copy) => (
          <li key={copy.id} className="flex flex-wrap items-center gap-2.5 py-3">
            <span className="font-mono text-sm font-bold text-stone-800">{copy.inventoryCode}</span>
            <span className="text-xs text-stone-400">{copy.shelfLocation ?? '-'}</span>
            <Badge {...STATUS_COPY[copy.status]} />
            <div className="ml-auto flex items-center gap-1.5">
              <Select
                value={copy.status}
                onChange={(e) => changeStatus(copy, e.target.value)}
                className="w-36 px-2 py-1.5 text-xs"
              >
                {Object.entries(STATUS_COPY).map(([value, s]) => (
                  <option key={value} value={value}>{s.label}</option>
                ))}
              </Select>
              <Button variant="danger" className="px-2.5 py-2 text-xs" onClick={() => remove(copy)}>
                <Trash2 size={13} />
              </Button>
            </div>
          </li>
        ))}
        {copies.length === 0 && (
          <li className="py-8 text-center text-sm text-stone-500">Belum ada eksemplar — tambahkan unit fisik buku ini.</li>
        )}
      </ul>
    </Modal>
  );
}
