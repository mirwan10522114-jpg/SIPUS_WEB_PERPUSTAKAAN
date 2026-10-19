import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { Loader2, Inbox } from 'lucide-react';

// ---------------- Button ----------------
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  secondary: 'bg-brand-100 text-brand-800 hover:bg-brand-200',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-stone-600 hover:bg-stone-100',
  outline: 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
};

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

// ---------------- Form fields ----------------
const fieldBase =
  'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-stone-100';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return <input ref={ref} className={`${fieldBase} min-h-11 ${className}`} {...props} />;
  }
);

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldBase} min-h-11 ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} min-h-24 ${className}`} {...props} />;
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-stone-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

// ---------------- Badge ----------------
export function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

// ---------------- Card ----------------
export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

// ---------------- Modal ----------------
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-stone-900">{title}</h3>
          <button onClick={onClose} className="min-h-11 min-w-11 rounded-xl p-2 text-stone-500 hover:bg-stone-100" aria-label="Tutup">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------- Spinner & Empty ----------------
export function Spinner({ full }: { full?: boolean }) {
  if (full) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={28} className="animate-spin text-brand-600" />
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Inbox size={36} className="text-stone-300" />
      <p className="font-semibold text-stone-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-stone-500">{description}</p>}
    </div>
  );
}

// ---------------- Pagination ----------------
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== -1) pages.push(-1);
  }
  return (
    <nav className="mt-5 flex flex-wrap items-center justify-center gap-1.5" aria-label="Navigasi halaman">
      <button
        className="min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ‹ Sebelumnya
      </button>
      {pages.map((p, i) =>
        p === -1 ? (
          <span key={`gap-${i}`} className="px-1.5 text-stone-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`min-h-10 min-w-10 rounded-lg px-3 py-2 text-sm font-semibold ${
              p === page ? 'bg-brand-700 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        className="min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Berikutnya ›
      </button>
    </nav>
  );
}

// ---------------- StatCard ----------------
export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'brand',
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'brand' | 'amber' | 'red' | 'emerald' | 'sky';
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-100 text-brand-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-600',
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-stone-500 sm:text-sm">{label}</p>
        <p className="text-xl font-extrabold text-stone-900 sm:text-2xl">{value}</p>
        {sub && <p className="truncate text-xs text-stone-500">{sub}</p>}
      </div>
    </Card>
  );
}
