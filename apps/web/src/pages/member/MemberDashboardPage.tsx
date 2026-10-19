import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, HandCoins, Bookmark, History, Clock, AlertTriangle } from 'lucide-react';
import { api, errMessage } from '../../api/client';
import type { Loan, Fine, Reservation } from '../../api/types';
import { Badge, Button, Card, EmptyState, Spinner, StatCard } from '../../components/ui/ui';
import { useToast } from '../../components/ui/Toast';
import {
  STATUS_LOAN, STATUS_RESERVATION, STATUS_FINE, deskripsiTenggat, rupiah, tanggal,
} from '../../utils/format';

type Tab = 'active' | 'history' | 'fines' | 'reservations';

export function MemberDashboardPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.get('/loans/me'),
      api.get('/fines/me'),
      api.get('/reservations/me'),
    ])
      .then(([l, f, r]) => {
        setLoans(l.data.data);
        setFines(f.data.data);
        setReservations(r.data.data);
      })
      .catch((e) => toast('error', errMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const activeLoans = loans.filter((l) => l.status === 'borrowed' || l.status === 'overdue');
  const unpaidFines = fines.filter((f) => f.status === 'unpaid');
  const unpaidTotal = unpaidFines.reduce((sum, f) => sum + Number(f.amount), 0);
  const activeReservations = reservations.filter((r) => r.status === 'waiting' || r.status === 'ready');

  const cancelReservation = async (id: number) => {
    setCancelling(id);
    try {
      await api.put(`/reservations/${id}/cancel`);
      toast('success', 'Reservasi dibatalkan');
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)));
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setCancelling(null);
    }
  };

  if (loading) return <Spinner />;

  const tabs: Array<{ id: Tab; label: string; icon: typeof BookOpen; count?: number }> = [
    { id: 'active', label: 'Sedang Dipinjam', icon: BookOpen, count: activeLoans.length },
    { id: 'history', label: 'Riwayat', icon: History },
    { id: 'fines', label: 'Denda', icon: HandCoins, count: unpaidFines.length },
    { id: 'reservations', label: 'Reservasi', icon: Bookmark, count: activeReservations.length },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-stone-900">Dashboard Saya</h1>
        <p className="mt-1 text-sm text-stone-500">Pantau peminjaman, denda, dan reservasi Anda.</p>
      </header>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<BookOpen size={22} />} label="Sedang Dipinjam" value={activeLoans.length} tone="brand" />
        <StatCard
          icon={<Clock size={22} />}
          label="Jatuh Tempo Terdekat"
          value={activeLoans.length ? tanggal(activeLoans.map((l) => l.dueDate).sort()[0]) : '—'}
          tone="sky"
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          label="Denda Belum Lunas"
          value={rupiah(unpaidTotal)}
          sub={unpaidFines.length ? `${unpaidFines.length} tagihan` : undefined}
          tone={unpaidFines.length ? 'red' : 'emerald'}
        />
        <StatCard icon={<Bookmark size={22} />} label="Reservasi Aktif" value={activeReservations.length} tone="amber" />
      </div>

      {unpaidFines.length > 0 && (
        <Card className="flex flex-wrap items-center gap-3 border-red-200 bg-red-50 p-4">
          <AlertTriangle size={20} className="text-red-500" />
          <p className="flex-1 text-sm font-medium text-red-700">
            Anda memiliki denda belum lunas senilai <b>{rupiah(unpaidTotal)}</b>. Lunasi di meja pustakawan sebelum
            meminjam buku lagi.
          </p>
          <Link to="/katalog">
            <Button variant="outline">Katalog</Button>
          </Link>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === id ? 'bg-brand-700 text-white shadow' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Icon size={16} /> {label}
            {count != null && count > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tab === id ? 'bg-white/20' : 'bg-stone-100'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        {(tab === 'active' || tab === 'history') && (
          <LoanList loans={tab === 'active' ? activeLoans : loans.filter((l) => l.status === 'returned')} emptyText={tab === 'active' ? 'Tidak ada buku yang sedang dipinjam.' : 'Belum ada riwayat peminjaman.'} />
        )}

        {tab === 'fines' && (
          <>
            {fines.length === 0 ? (
              <EmptyState title="Tidak ada denda" description="Pertahankan kebiasaan mengembalikan buku tepat waktu!" />
            ) : (
              <ul className="divide-y divide-stone-100">
                {fines.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-3 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-stone-800">
                        {f.loan?.bookCopy?.book?.title ?? `Pinjaman #${f.loanId}`}
                      </p>
                      <p className="text-xs text-stone-500">
                        {f.reason} · {tanggal(f.createdAt)}
                      </p>
                    </div>
                    <span className="font-bold text-stone-900">{rupiah(f.amount)}</span>
                    <Badge {...STATUS_FINE[f.status]} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'reservations' && (
          <>
            {reservations.length === 0 ? (
              <EmptyState
                title="Belum ada reservasi"
                description="Reservasi buku yang seluruh eksemplarnya sedang dipinjam dari halaman detail buku."
              />
            ) : (
              <ul className="divide-y divide-stone-100">
                {reservations.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-3.5">
                    <div className="min-w-0 flex-1">
                      <Link to={`/katalog/${r.bookId}`} className="truncate text-sm font-bold text-stone-800 hover:text-brand-700">
                        {r.book?.title ?? `Buku #${r.bookId}`}
                      </Link>
                      <p className="text-xs text-stone-500">
                        Dibuat {tanggal(r.reservationDate)}
                        {r.readyUntil && r.status === 'ready' && ` · ambil sebelum ${tanggal(r.readyUntil)}`}
                      </p>
                    </div>
                    <Badge {...STATUS_RESERVATION[r.status]} />
                    {(r.status === 'waiting' || r.status === 'ready') && (
                      <Button
                        variant="outline"
                        className="px-3 py-2 text-xs"
                        loading={cancelling === r.id}
                        onClick={() => cancelReservation(r.id)}
                      >
                        Batalkan
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function LoanList({ loans, emptyText }: { loans: Loan[]; emptyText: string }) {
  if (loans.length === 0) return <EmptyState title={emptyText} />;
  return (
    <ul className="divide-y divide-stone-100">
      {loans.map((loan) => {
        const status = STATUS_LOAN[loan.status] ?? STATUS_LOAN.borrowed;
        return (
          <li key={loan.id} className="flex flex-wrap items-center gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <Link
                to={`/katalog/${loan.bookCopy?.book?.id}`}
                className="truncate text-sm font-bold text-stone-800 hover:text-brand-700"
              >
                {loan.bookCopy?.book?.title ?? 'Buku'}
              </Link>
              <p className="text-xs text-stone-500">
                Pinjam {tanggal(loan.loanDate)} · jatuh tempo {tanggal(loan.dueDate)}
                {loan.returnDate && ` · kembali ${tanggal(loan.returnDate)}`}
              </p>
              <p className="mt-0.5 font-mono text-xs text-stone-400">{loan.bookCopy?.inventoryCode}</p>
            </div>
            {loan.status !== 'returned' && (
              <span className={`text-xs font-bold ${(loan.status === 'overdue') ? 'text-red-600' : 'text-stone-600'}`}>
                <Clock size={12} className="mr-1 inline" />
                {deskripsiTenggat(loan.dueDate)}
              </span>
            )}
            <Badge label={status.label} cls={status.cls} />
          </li>
        );
      })}
    </ul>
  );
}
