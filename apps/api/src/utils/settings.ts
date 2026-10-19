import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';

const SETTING_DEFAULTS: Record<string, string> = {
  fine_per_day: '1000',
  loan_days: '7',
  max_loans_siswa: '2',
  max_loans_guru: '5',
  reservation_hold_days: '2',
  library_name: 'Perpustakaan Sekolah',
};

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  const map = { ...SETTING_DEFAULTS };
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function getNumberSetting(key: string): Promise<number> {
  const s = await getSettings();
  const v = parseInt(s[key] ?? '', 10);
  return Number.isFinite(v) ? v : parseInt(SETTING_DEFAULTS[key] ?? '0', 10);
}

export function maxLoansKeyForRole(role: Role): string {
  return role === 'guru' ? 'max_loans_guru' : 'max_loans_siswa';
}
