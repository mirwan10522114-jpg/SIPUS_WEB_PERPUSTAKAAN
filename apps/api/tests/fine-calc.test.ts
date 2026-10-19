import { computeLateDays, computeFineAmount, computeDueDate } from '../src/utils/fine-calc';

describe('Perhitungan denda & jatuh tempo (FR-17, FR-20, FR-24)', () => {
  // Bangun tanggal di zona waktu lokal agar perbandingan tanggal-saja stabil
  const d = (y: number, m: number, day: number, h = 9) => new Date(y, m - 1, day, h, 0, 0);

  test('computeLateDays: tepat waktu → 0', () => {
    expect(computeLateDays(d(2026, 8, 20), d(2026, 8, 20, 23))).toBe(0);
  });

  test('computeLateDays: lebih cepat → 0', () => {
    expect(computeLateDays(d(2026, 8, 20), d(2026, 8, 18))).toBe(0);
  });

  test('computeLateDays: telat 3 hari → 3', () => {
    expect(computeLateDays(d(2026, 8, 20), d(2026, 8, 23))).toBe(3);
  });

  test('computeLateDays: telat di jam yang sama hari berikutnya → 1', () => {
    expect(computeLateDays(d(2026, 8, 20, 10), d(2026, 8, 21, 10))).toBe(1);
  });

  test('computeFineAmount: tarif 1000/hari × 5 hari', () => {
    expect(computeFineAmount(5, 1000)).toBe(5000);
  });

  test('computeFineAmount: tidak telat → 0', () => {
    expect(computeFineAmount(0, 1000)).toBe(0);
  });

  test('computeFineAmount: tarif 0 → 0', () => {
    expect(computeFineAmount(7, 0)).toBe(0);
  });

  test('computeDueDate: pinjam 7 hari', () => {
    const due = computeDueDate(d(2026, 8, 1, 9), 7);
    expect(due.getTime() - d(2026, 8, 1, 9).getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
