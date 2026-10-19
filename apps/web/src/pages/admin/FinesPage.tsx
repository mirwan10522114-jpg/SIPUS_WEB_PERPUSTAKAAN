import { useCallback, useEffect, useState } from 'react';
import { HandCoins, Search } from 'lucide-react';
import { api, errMessage } from '../../api/client';
import type { Fine, PaginationMeta } from '../../api/types';
import { Badge, Button, Card, EmptyState, Input, Pagination, Select, Spinner, StatCard } from '../../components/ui/ui';
import { useToast } from '../../components/ui/Toast';
import { rupiah, tanggal, STATUS_FINE } from '../../utils/format';

export function FinesPage() {
  const toast = useToast();
  const [fines, setFines] = useState<Fine[]>([]);
  const [meta, setMeta] = useState<(PaginationMeta & { unpaidTotal: number; unpaidCount: number }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 15 };
    if (q) params.q = q;
    if (status !== 'all') params.status = status;
    api
      .get('/fines', { params })
      .then((res) => {
        setFines(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((e) => toast('error', errMessage(e)))
      .finally(() => setLoading(false));
  }, [page, q, status]);

  useEffect(load, [load]);

  const pay = async (fine: Fine) => {
    if (!confirm(`Tandai denda ${rupiah(fine.amount)} atas nama ${fine.loan?.user?.name} sebagai lunas?`)) return;
    setPaying(fine.id);
    try {
      await api.put(`/fines/${fine.id}/pay`);
      toast('success', 'Denda berhasil ditandai lunas (FR-25)');
      load();
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-stone-900">Manajemen Denda</h1>
        <p className="mt-1 text-sm text-stone-500">Denda keterlambatan dihitung otomatis oleh sistem (FR-20, FR-24).</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          icon={<HandCoins size={22} />}
          label="Total Belum Lunas"
          value={rupiah(meta?.unpaidTotal ?? 0)}
          sub={`${meta?.unpaidCount ?? 0} tagihan`}
          tone={(meta?.unpaidCount ?? 0) > 0 ? 'red' : 'emerald'}
        />
        <StatCard icon={<HandCoins size={22} />} label="Halaman Ini" value={fines.length} sub="entri denda" tone="brand" />
        <StatCard icon={<HandCoins size={22} />} label="Total Data" value={meta?.total ?? 0} tone="sky" />
      </div>

      <Card className="flex flex-col gap-2 p-4 sm:flex-row">
        <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama anggota / judul buku…" className="pl-10" />
        </form>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-48">
          <option value="all">Semua Status</option>
          <option value="unpaid">Belum Lunas</option>
          <option value="paid">Lunas</option>
        </Select>
      </Card>

      {loading ? (
        <Spinner />
      ) : fines.length === 0 ? (
        <EmptyState title="Tidak ada data denda" description="Denda akan muncul otomatis saat ada pengembalian yang terlambat." />
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-3 font-semibold">Anggota</th>
                  <th className="px-4 py-3 font-semibold">Buku</th>
                  <th className="px-4 py-3 font-semibold">Alasan</th>
                  <th className="px-4 py-3 font-semibold">Jumlah</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {fines.map((f) => (
                  <tr key={f.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-stone-900">{f.loan?.user?.name}</p>
                      <p className="font-mono text-xs text-stone-500">{f.loan?.user?.identifier}</p>
                    </td>
                    <td className="max-w-52 px-4 py-3">
                      <p className="truncate font-medium text-stone-800">{f.loan?.bookCopy?.book?.title}</p>
                      <p className="font-mono text-xs text-stone-400">{f.loan?.bookCopy?.inventoryCode}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {f.reason}
                      <p className="text-xs text-stone-400">{tanggal(f.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-900">{rupiah(f.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge {...STATUS_FINE[f.status]} />
                      {f.paidAt && <p className="mt-1 text-xs text-stone-400">{tanggal(f.paidAt)}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.status === 'unpaid' ? (
                        <Button loading={paying === f.id} className="px-3 py-2 text-xs" onClick={() => pay(f)}>
                          Tandai Lunas
                        </Button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600">✓ Selesai</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile: kartu (FR-33) */}
          <div className="space-y-3 md:hidden">
            {fines.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900">{f.loan?.user?.name}</p>
                    <p className="truncate text-xs text-stone-500">{f.loan?.bookCopy?.book?.title}</p>
                  </div>
                  <Badge {...STATUS_FINE[f.status]} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-stone-500">{f.reason}</span>
                  <span className="font-bold text-stone-900">{rupiah(f.amount)}</span>
                </div>
                {f.status === 'unpaid' && (
                  <div className="mt-3 border-t border-stone-100 pt-3">
                    <Button loading={paying === f.id} className="w-full text-xs" onClick={() => pay(f)}>
                      Tandai Lunas
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  );
}
