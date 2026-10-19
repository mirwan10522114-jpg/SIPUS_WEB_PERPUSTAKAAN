import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Megaphone, BookOpen, ArrowRight, Library } from 'lucide-react';
import { api } from '../../api/client';
import type { Book, Announcement } from '../../api/types';
import { BookCard } from '../../components/BookCard';
import { Card, Spinner } from '../../components/ui/ui';
import { tanggal } from '../../utils/format';

export function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [libraryName, setLibraryName] = useState('Perpustakaan Sekolah');
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/books', { params: { limit: 8, sort: 'newest' } }),
      api.get('/announcements', { params: { limit: 3 } }),
      api.get('/settings/public'),
    ])
      .then(([booksRes, annRes, settingsRes]) => {
        setBooks(booksRes.data.data);
        setAnnouncements(annRes.data.data);
        setLibraryName(settingsRes.data.data.library_name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/katalog${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide">
              <Library size={14} /> {libraryName}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
              Jelajahi Koleksi Perpustakaan, <span className="text-brand-200">Di Mana Saja</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-brand-50/90 sm:text-base">
              Cari buku sebelum datang, pantau peminjaman & denda Anda, dan reservasi buku yang sedang
              dipinjam — semuanya online.
            </p>

            <form onSubmit={submitSearch} className="mt-6 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari judul, penulis, atau ISBN…"
                  className="min-h-12 w-full rounded-xl border-0 bg-white py-3.5 pl-11 pr-4 text-sm text-stone-800 shadow-lg outline-none placeholder:text-stone-400"
                />
              </div>
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-stone-800">
                Cari Buku <ArrowRight size={16} />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              {['Buku Pelajaran', 'Fiksi', 'Sains', 'Pengembangan Diri'].map((c) => (
                <Link
                  key={c}
                  to={`/katalog?q=${encodeURIComponent(c)}`}
                  className="rounded-full bg-white/10 px-3.5 py-2 font-semibold text-white/90 transition hover:bg-white/20"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <Spinner />
      ) : (
        <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:py-14">
          {/* Koleksi terbaru */}
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900 sm:text-2xl">Koleksi Terbaru</h2>
                <p className="mt-1 text-sm text-stone-500">Buku yang baru saja ditambahkan ke katalog.</p>
              </div>
              <Link to="/katalog" className="flex min-h-11 items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">
                Lihat semua <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {books.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          </section>

          {/* Pengumuman */}
          <section>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <Megaphone size={20} />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-stone-900 sm:text-2xl">Pengumuman</h2>
                <p className="text-sm text-stone-500">Informasi terbaru dari perpustakaan.</p>
              </div>
            </div>
            {announcements.length === 0 ? (
              <Card className="p-6 text-center text-sm text-stone-500">Belum ada pengumuman.</Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {announcements.map((a) => (
                  <Card key={a.id} className="flex flex-col p-5">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-700">
                      <BookOpen size={14} /> {tanggal(a.publishedAt)}
                    </div>
                    <h3 className="font-bold text-stone-900">{a.title}</h3>
                    <p className="mt-1.5 line-clamp-4 flex-1 text-sm leading-relaxed text-stone-600">{a.content}</p>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
