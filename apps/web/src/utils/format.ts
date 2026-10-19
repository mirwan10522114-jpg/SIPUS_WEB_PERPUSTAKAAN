/** Format Rupiah: 5000 → "Rp5.000" */
export function rupiah(value: number | string): string {
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  if (!Number.isFinite(n)) return 'Rp0';
  return 'Rp' + n.toLocaleString('id-ID');
}

const DATE_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** Format tanggal: "20 Agu 2026" */
export function tanggal(value?: string | Date | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', DATE_OPTS);
}

/** Tanggal + jam: "20 Agu 2026, 14.30" */
export function tanggalJam(value?: string | Date | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return (
    d.toLocaleDateString('id-ID', DATE_OPTS) + ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );
}

/** Selisih hari dari sekarang (negatif = lewat). */
export function hariDariSekarang(value: string | Date): number {
  const target = new Date(value);
  const now = new Date();
  const a = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((a - b) / 86400000);
}

/** Deskripsi tenggat: "3 hari lagi" / "Hari ini" / "Terlambat 2 hari" */
export function deskripsiTenggat(dueDate: string | Date): string {
  const diff = hariDariSekarang(dueDate);
  if (diff > 1) return `${diff} hari lagi`;
  if (diff === 1) return 'Besok';
  if (diff === 0) return 'Hari ini';
  if (diff === -1) return 'Terlambat 1 hari';
  return `Terlambat ${Math.abs(diff)} hari`;
}

export const ROLE_LABEL: Record<string, string> = {
  siswa: 'Siswa',
  guru: 'Guru',
  admin: 'Pustakawan',
  super_admin: 'Super Admin',
};

export const STATUS_COPY: Record<string, { label: string; cls: string }> = {
  available: { label: 'Tersedia', cls: 'bg-emerald-100 text-emerald-700' },
  borrowed: { label: 'Dipinjam', cls: 'bg-amber-100 text-amber-700' },
  lost: { label: 'Hilang', cls: 'bg-red-100 text-red-700' },
  damaged: { label: 'Rusak', cls: 'bg-orange-100 text-orange-700' },
  maintenance: { label: 'Perawatan', cls: 'bg-stone-200 text-stone-600' },
};

export const STATUS_LOAN: Record<string, { label: string; cls: string }> = {
  borrowed: { label: 'Dipinjam', cls: 'bg-sky-100 text-sky-700' },
  returned: { label: 'Dikembalikan', cls: 'bg-emerald-100 text-emerald-700' },
  overdue: { label: 'Terlambat', cls: 'bg-red-100 text-red-700' },
  lost: { label: 'Hilang', cls: 'bg-red-100 text-red-700' },
};

export const STATUS_RESERVATION: Record<string, { label: string; cls: string }> = {
  waiting: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Siap Diambil', cls: 'bg-emerald-100 text-emerald-700' },
  fulfilled: { label: 'Selesai', cls: 'bg-sky-100 text-sky-700' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-stone-200 text-stone-600' },
  expired: { label: 'Kedaluwarsa', cls: 'bg-red-100 text-red-700' },
};

export const STATUS_FINE: Record<string, { label: string; cls: string }> = {
  unpaid: { label: 'Belum Lunas', cls: 'bg-red-100 text-red-700' },
  paid: { label: 'Lunas', cls: 'bg-emerald-100 text-emerald-700' },
};
