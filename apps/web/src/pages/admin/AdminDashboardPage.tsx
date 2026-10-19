import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookMarked, Users, BookOpen, AlertTriangle, HandCoins, ArrowRightLeft,
  TrendingUp, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '../../api/client';
import type { DashboardStats } from '../../api/types';
import { Badge, Card, EmptyState, Spinner, StatCard } from '../../components/ui/ui';
import { STATUS_LOAN, tanggal } from '../../utils/format';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get('/dashboard/stats').then((res) => setStats(res.data.data)).catch(() => {});
  }, []);

  if (!stats) return <Spinner />;

  const series = stats.series.map((s) => ({ ...s, label: tanggal(s.date).slice(0, 6) }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">Ringkasan operasional perpustakaan hari ini.</p>
        </div>
        <Link
          to="/admin/sirkulasi"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800"
        >
          <ArrowRightLeft size={16} /> Buka Sirkulasi
        </Link>
      </header>

      {/* Statistik utama */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<BookMarked size={22} />} label="Judul Buku" value={stats.totalBooks} sub={`${stats.totalCopies} eksemplar`} tone="brand" />
        <StatCard icon={<Users size={22} />} label="Anggota Aktif" value={stats.totalMembers} tone="sky" />
        <StatCard icon={<BookOpen size={22} />} label="Sedang Dipinjam" value={stats.activeLoans} sub={`${stats.availableCopies} tersedia`} tone="amber" />
        <StatCard icon={<AlertTriangle size={22} />} label="Terlambat" value={stats.overdueLoans} tone={stats.overdueLoans ? 'red' : 'emerald'} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<ArrowRightLeft size={22} />} label="Pinjam Hari Ini" value={stats.todayLoans} tone="emerald" />
        <StatCard icon={<ArrowRightLeft size={22} />} label="Kembali Hari Ini" value={stats.todayReturns} tone="emerald" />
        <StatCard icon={<HandCoins size={22} />} label="Denda Belum Lunas" value={stats.unpaidFinesCount} sub={`Rp${stats.unpaidFinesTotal.toLocaleString('id-ID')}`} tone={stats.unpaidFinesCount ? 'red' : 'emerald'} />
        <StatCard icon={<TrendingUp size={22} />} label="Eksemplar Dipinjam" value={stats.borrowedCopies} sub={`dari ${stats.totalCopies}`} tone="brand" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grafik 7 hari */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-600" />
            <h2 className="font-bold text-stone-900">Peminjaman 7 Hari Terakhir</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="loanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [`${v} peminjaman`, '']}
                  labelFormatter={(l) => `Hari: ${l}`}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="count" stroke="#0f766e" strokeWidth={2.5} fill="url(#loanGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Terpopuler */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-600" />
              <h2 className="font-bold text-stone-900">Terpopuler Bulan Ini</h2>
            </div>
            <Link to="/admin/laporan" className="text-xs font-bold text-brand-700 hover:underline">
              Laporan lengkap →
            </Link>
          </div>
          {stats.top5.length === 0 ? (
            <EmptyState title="Belum ada data peminjaman bulan ini" />
          ) : (
            <ol className="space-y-2.5">
              {stats.top5.map((b, i) => (
                <li key={b.title} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-stone-800">{b.title}</p>
                    <p className="truncate text-xs text-stone-500">{b.author}</p>
                  </div>
                  <span className="text-sm font-bold text-brand-700">{b.count}×</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Transaksi terbaru */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-stone-900">Peminjaman Terbaru</h2>
          <Link to="/admin/sirkulasi" className="text-xs font-bold text-brand-700 hover:underline">
            Semua →
          </Link>
        </div>
        {stats.recentLoans.length === 0 ? (
          <EmptyState title="Belum ada transaksi" />
        ) : (
          <ul className="divide-y divide-stone-100">
            {stats.recentLoans.map((loan) => {
              const status = STATUS_LOAN[loan.status] ?? STATUS_LOAN.borrowed;
              return (
                <li key={loan.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-stone-800">{loan.bookCopy?.book?.title}</p>
                    <p className="truncate text-xs text-stone-500">
                      {loan.user?.name} ({loan.user?.classOrPosition}) · {tanggal(loan.loanDate)}
                    </p>
                  </div>
                  <span className="text-xs text-stone-400">jatuh tempo {tanggal(loan.dueDate)}</span>
                  <Badge label={status.label} cls={status.cls} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
