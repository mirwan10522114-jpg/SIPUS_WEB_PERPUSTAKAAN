import { Link } from 'react-router-dom';
import { BookOpen, BookX } from 'lucide-react';
import type { Book } from '../api/types';

const FALLBACK_COLORS = [
  'from-brand-500 to-brand-700',
  'from-rose-500 to-rose-700',
  'from-indigo-500 to-indigo-700',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-700',
  'from-violet-500 to-purple-700',
];

export function BookCard({ book }: { book: Book }) {
  const colorIdx = book.id % FALLBACK_COLORS.length;
  const available = book.availableCopies ?? 0;

  return (
    <Link
      to={`/katalog/${book.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Cover — lazy loading (FR-35) */}
      <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={`Sampul ${book.title}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br p-4 text-center ${FALLBACK_COLORS[colorIdx]}`}>
            <BookOpen size={34} className="text-white/80" />
            <span className="line-clamp-4 text-sm font-bold text-white">{book.title}</span>
            <span className="text-xs text-white/70">{book.author}</span>
          </div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-bold shadow ${
            available > 0 ? 'bg-white/95 text-emerald-700' : 'bg-white/95 text-red-600'
          }`}
        >
          {available > 0 ? `${available} tersedia` : 'Habis'}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 group-hover:text-brand-700">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-xs text-stone-500">{book.author}</p>
        <div className="mt-auto flex items-center gap-2 pt-2 text-[11px] text-stone-400">
          <span className="truncate rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-600">
            {book.category?.name ?? 'Umum'}
          </span>
          {book.publishYear && <span>{book.publishYear}</span>}
          {available === 0 && <BookX size={13} className="ml-auto text-red-400" />}
        </div>
      </div>
    </Link>
  );
}
