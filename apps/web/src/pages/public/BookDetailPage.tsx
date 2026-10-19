import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Barcode, User, Calendar, Building2, BookmarkPlus, LogIn } from 'lucide-react';
import { api, errMessage } from '../../api/client';
import type { Book } from '../../api/types';
import { Badge, Button, Card, Spinner } from '../../components/ui/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { STATUS_COPY } from '../../utils/format';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const load = () => {
    api
      .get(`/books/${id}`)
      .then((res) => setBook(res.data.data))
      .catch(() => toast('error', 'Buku tidak ditemukan'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading) return <Spinner />;
  if (!book) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-stone-600">Buku tidak ditemukan.</p>
        <Link to="/katalog" className="mt-4 inline-block font-bold text-brand-700 hover:underline">
          ← Kembali ke katalog
        </Link>
      </div>
    );
  }

  const available = book.copies?.filter((c) => c.status === 'available').length ?? 0;
  const canBorrow = available > 0;
  const isMember = user && (user.role === 'siswa' || user.role === 'guru');

  const reserve = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/katalog/${id}` } });
      return;
    }
    setReserving(true);
    try {
      const res = await api.post('/reservations', { bookId: book.id });
      toast('success', res.data.message);
      load();
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/katalog" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-700 hover:underline">
        <ArrowLeft size={18} /> Kembali ke Katalog
      </Link>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Cover */}
        <div>
          <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm">
            {book.coverImageUrl ? (
              <img src={book.coverImageUrl} alt={`Sampul ${book.title}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-center text-white">
                <span className="text-5xl font-extrabold opacity-90">{book.title.charAt(0)}</span>
                <span className="text-lg font-bold">{book.title}</span>
              </div>
            )}
          </div>

          {/* Status & CTA */}
          <Card className="mt-4 space-y-3 p-4">
            <div className="text-center">
              {canBorrow ? (
                <p className="text-sm font-bold text-emerald-700">✓ Tersedia {available} dari {book.copies?.length ?? 0} eksemplar</p>
              ) : (
                <p className="text-sm font-bold text-red-600">Semua eksemplar sedang dipinjam</p>
              )}
            </div>
            {canBorrow ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-xs font-medium text-emerald-700">
                Datang langsung ke perpustakaan untuk meminjam buku ini.
              </p>
            ) : (
              <>
                <Button className="w-full" loading={reserving} onClick={reserve} disabled={!isMember && !!user && !isMember}>
                  {user ? (
                    isMember ? (
                      <>
                        <BookmarkPlus size={16} /> Reservasi Buku
                      </>
                    ) : (
                      'Khusus anggota siswa/guru'
                    )
                  ) : (
                    <>
                      <LogIn size={16} /> Masuk untuk Reservasi
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-stone-500">
                  Anda akan diberi notifikasi saat buku tersedia (FR-22).
                </p>
              </>
            )}
          </Card>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800">
              {book.category?.name ?? 'Umum'}
            </span>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight text-stone-900 sm:text-3xl">{book.title}</h1>
            <p className="mt-1 text-lg text-stone-600">{book.author}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { icon: Building2, label: 'Penerbit', value: `${book.publisher ?? '-'}${book.publishYear ? ` · ${book.publishYear}` : ''}` },
              { icon: Barcode, label: 'ISBN', value: book.isbn ?? '-' },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className="flex items-center gap-3 p-4">
                <Icon size={20} className="shrink-0 text-brand-600" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-stone-500">{label}</p>
                  <p className="truncate text-sm font-semibold text-stone-800">{value}</p>
                </div>
              </Card>
            ))}
          </div>

          {book.description && (
            <Card className="p-5">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">Sinopsis</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700">{book.description}</p>
            </Card>
          )}

          {/* Daftar eksemplar (FR-09) */}
          <Card className="overflow-hidden">
            <h2 className="border-b border-stone-100 px-5 py-4 text-sm font-bold uppercase tracking-wide text-stone-500">
              Daftar Eksemplar
            </h2>
            <ul className="divide-y divide-stone-100">
              {book.copies?.map((copy) => (
                <li key={copy.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <Barcode size={16} className="shrink-0 text-stone-400" />
                  <span className="font-mono text-sm font-semibold text-stone-800">{copy.inventoryCode}</span>
                  {copy.shelfLocation && (
                    <span className="flex items-center gap-1 text-xs text-stone-500">
                      <MapPin size={12} /> {copy.shelfLocation}
                    </span>
                  )}
                  <span className="ml-auto">
                    <Badge {...STATUS_COPY[copy.status]} />
                  </span>
                </li>
              ))}
              {(!book.copies || book.copies.length === 0) && (
                <li className="px-5 py-6 text-center text-sm text-stone-500">Belum ada eksemplar terdaftar.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
