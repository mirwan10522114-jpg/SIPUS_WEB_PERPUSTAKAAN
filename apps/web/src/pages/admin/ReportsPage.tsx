import { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, BarChart3, Download, Printer } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api, errMessage } from '../../api/client';
import type { Loan } from '../../api/types';
import { Badge, Button, Card, EmptyState, Select, Spinner, StatCard } from '../../components/ui/ui';
import { useToast } from '../../components/ui/Toast';
import { rupiah, tanggal, deskripsiTenggat } from '../../utils/format';

type ReportTab = 'popular' | 'overdue' | 'transactions';

export function ReportsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<ReportTab>('popular');
  const [period, setPeriod] = useState('');
  const [txnPeriod, setTxnPeriod] = useState<'day' | 'month'>('day');
  const [popular, setPopular] = useState<Array<{ title: string; author: string; count: number }>>([]);
  const [overdue, setOverdue] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<Array<{ period: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const reqs =
      tab === 'popular'
        ? [api.get('/reports/popular-books', { params: period ? { period } : {} })]
        : tab === 'overdue'
          ? [api.get('/reports/overdue')]
          : [api.get('/reports/transactions', { params: { period: txnPeriod } })];
    Promise.all(reqs)
      .then(([res]: any) => {
        if (tab === 'popular') setPopular(res.data.data);
        else if (tab === 'overdue') setOverdue(res.data.data);
        else setTransactions(res.data.data);
      })
      .catch((e) => toast('error', errMessage(e)))
      .finally(() => setLoading(false));
  }, [tab, period, txnPeriod]);

  const exportExcel = () => {
    const type = tab === 'popular' ? 'popular' : tab === 'overdue' ? 'overdue' : 'transactions';
    const params = new URLSearchParams({ type });
    if (tab === 'popular' && period) params.set('period', period);
    if (tab === 'transactions') params.set('period', txnPeriod);
    window.open(`/api/reports/export?${params.toString()}`, '_blank');
  };

  const totalTxn = transactions.reduce((s, t) => s + t.count, 0);
  const maxPopular = Math.max(1, ...popular.map((p) => p.count));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Laporan & Statistik</h1>
          <p className="mt-1 text-sm text-stone-500">Laporan buku terpopuler, keterlambatan, dan transaksi (FR-27..29).</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={16} /> Cetak / PDF
          </Button>
          <Button onClick={exportExcel}>
            <Download size={16} /> Export Excel
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5 no-print">
        {(
          [
            { id: 'popular', label: 'Buku Terpopuler', icon: TrendingUp },
            { id: 'overdue', label: 'Keterlambatan', icon: AlertTriangle },
            { id: 'transactions', label: 'Transaksi', icon: BarChart3 },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              tab === id ? 'bg-brand-700 text-white shadow' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'popular' && (
        <div className="no-print mb-1">
          <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-48">
            <option value="">Sepanjang Waktu</option>
            <option value="month">30 Hari Terakhir</option>
            <option value="90d">90 Hari Terakhir</option>
          </Select>
        </div>
      )}
      {tab === 'transactions' && (
        <div className="no-print mb-1">
          <Select value={txnPeriod} onChange={(e) => setTxnPeriod(e.target.value as 'day' | 'month')} className="w-48">
            <option value="day">Harian (14 hari)</option>
            <option value="month">Bulanan (12 bulan)</option>
          </Select>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <>
          {tab === 'popular' && (
            <Card className="p-5">
              <h2 className="mb-4 font-bold text-stone-900">Peringkat Peminjaman Buku</h2>
              {popular.length === 0 ? (
                <EmptyState title="Belum ada data peminjaman pada periode ini" />
              ) : (
                <ol className="space-y-2">
                  {popular.map((p, i) => (
                    <li key={p.title} className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm font-bold text-stone-800">{p.title}</p>
                          <span className="shrink-0 text-sm font-bold text-brand-700">{p.count}×</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all"
                            style={{ width: `${(p.count / maxPopular) * 100}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-stone-500">{p.author}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )}

          {tab === 'overdue' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<AlertTriangle size={22} />} label="Total Terlambat" value={overdue.length} tone={overdue.length ? 'red' : 'emerald'} />
                <StatCard
                  icon={<AlertTriangle size={22} />}
                  label="Estimasi Total Denda"
                  value={rupiah(overdue.reduce((s, l) => s + (l.estimatedFine ?? 0), 0))}
                  tone="amber"
                />
              </div>
              <Card className="p-5">
                {overdue.length === 0 ? (
                  <EmptyState title="Tidak ada buku terlambat 🎉" description="Semua peminjaman aktif masih dalam tenggat." />
                ) : (
                  <ul className="divide-y divide-stone-100">
                    {overdue.map((loan) => (
                      <li key={loan.id} className="flex flex-wrap items-center gap-3 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-stone-800">{loan.bookCopy?.book?.title}</p>
                          <p className="text-xs text-stone-500">
                            {loan.user?.name} ({loan.user?.classOrPosition ?? loan.user?.role}) · pinjam {tanggal(loan.loanDate)}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-bold text-red-600">{deskripsiTenggat(loan.dueDate)}</p>
                          <p className="text-stone-500">jatuh tempo {tanggal(loan.dueDate)}</p>
                        </div>
                        <Badge label={`Est. ${rupiah(loan.estimatedFine ?? 0)}`} cls="bg-red-100 text-red-700" />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          {tab === 'transactions' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<BarChart3 size={22} />} label="Total Transaksi" value={totalTxn} tone="brand" />
                <StatCard
                  icon={<BarChart3 size={22} />}
                  label="Rata-rata"
                  value={transactions.length ? (totalTxn / transactions.length).toFixed(1) : 0}
                  sub={txnPeriod === 'day' ? 'per hari' : 'per bulan'}
                  tone="sky"
                />
              </div>
              <Card className="p-5">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={transactions} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 10, fill: '#78716c' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: string) => (txnPeriod === 'month' ? v.slice(2) : v.slice(5))}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: number) => [`${v} peminjaman`, '']}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 12 }}
                      />
                      <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
