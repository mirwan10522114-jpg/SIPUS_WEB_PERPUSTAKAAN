const DAY_MS = 24 * 60 * 60 * 1000;

function dateOnly(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Hitung jumlah hari keterlambatan (per hari penuh, tanggal-saja).
 * Kembali tepat waktu atau lebih cepat → 0.
 */
export function computeLateDays(dueDate: Date, returnDate: Date): number {
  const diff = Math.floor((dateOnly(returnDate) - dateOnly(dueDate)) / DAY_MS);
  return diff > 0 ? diff : 0;
}

/** Hitung denda keterlambatan: lateDays × tarif per hari (dibulatkan ke rupiah). */
export function computeFineAmount(lateDays: number, finePerDay: number): number {
  if (lateDays <= 0 || finePerDay <= 0) return 0;
  return Math.round(lateDays * finePerDay);
}

/** Tanggal jatuh tempo = tanggal pinjam + N hari. */
export function computeDueDate(loanDate: Date, loanDays: number): Date {
  return new Date(loanDate.getTime() + loanDays * DAY_MS);
}
