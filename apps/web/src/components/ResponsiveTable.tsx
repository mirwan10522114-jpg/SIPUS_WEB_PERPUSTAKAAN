import { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Di tampilan card: label field (subjudul kecil) */
  cardLabel?: string;
  hideOnCard?: boolean;
}

/**
 * Tabel responsif (FR-33): tampil sebagai tabel penuh di layar ≥768px,
 * dan berubah menjadi daftar kartu di layar kecil agar tidak perlu scroll horizontal.
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  keyField,
  cardTitle,
  cardSubtitle,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  keyField: (row: T) => string | number;
  cardTitle: (row: T) => ReactNode;
  cardSubtitle?: (row: T) => ReactNode;
  empty?: ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <>
      {/* Desktop: tabel */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-semibold">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row) => (
              <tr key={keyField(row)} className="transition hover:bg-stone-50">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 align-middle">
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: kartu */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={keyField(row)} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-2 border-b border-stone-100 pb-2">{cardTitle(row)}</div>
            {cardSubtitle && <div className="mb-3 text-sm text-stone-500">{cardSubtitle(row)}</div>}
            <dl className="space-y-1.5">
              {columns
                .filter((c) => c.key !== 'actions' && !c.hideOnCard)
                .map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                    <dt className="shrink-0 text-stone-500">{c.header}</dt>
                    <dd className="text-right font-medium text-stone-800">{c.render(row)}</dd>
                  </div>
                ))}
            </dl>
            {columns.find((c) => c.key === 'actions') && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                {columns.find((c) => c.key === 'actions')!.render(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
