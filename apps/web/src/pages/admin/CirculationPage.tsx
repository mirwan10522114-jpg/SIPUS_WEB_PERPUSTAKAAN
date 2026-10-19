import { useEffect, useRef, useState } from 'react';
import {
  Barcode, CheckCircle2, UserCheck, UserX, RefreshCw, BookUp2, BookDown,
  IdCard, CalendarDays, AlertTriangle,
} from 'lucide-react';
import { api, errMessage } from '../../api/client';
import type { Loan, Member, Book } from '../../api/types';
import { Badge, Button, Card, Input, Spinner } from '../../components/ui/ui';
import { QrScanner } from '../../components/QrScanner';
import { useToast } from '../../components/ui/Toast';
import { parseMemberQr, parseCopyQr } from '../../utils/qr';
import { rupiah, tanggal, deskripsiTenggat, STATUS_COPY } from '../../utils/format';

/**
 * Sirkulasi (PRD §13, FR-16/19, FR-34):
 *  1. Scan QR kartu siswa → sistem mengenali NIS + nama
 *  2. Scan QR buku → sistem mengenali kode + judul
 *  3. Sistem menampilkan detail peminjaman (tanggal pinjam & jatuh tempo)
 *  4. Petugas klik "Konfirmasi Peminjaman" → status buku jadi Dipinjam
 * Pengembalian: scan QR buku → detail transaksi + keterlambatan → konfirmasi.
 * Scanner barcode USB tetap bekerja lewat input manual + Enter.
 */
export function CirculationPage() {
  const [tab, setTab] = useState<'borrow' | 'return'>('borrow');
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-stone-900">Sirkulasi</h1>
        <p className="mt-1 text-sm text-stone-500">
          Scan QR kartu siswa → scan QR buku → konfirmasi. Tanpa mengetik manual (scanner USB juga didukung).
        </p>
      </header>

      <div className="flex gap-1.5">
        {(
          [
            { id: 'borrow', label: 'Peminjaman', icon: BookUp2 },
            { id: 'return', label: 'Pengembalian', icon: BookDown },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              tab === id
                ? 'bg-brand-700 text-white shadow'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'borrow' ? <BorrowPanel /> : <ReturnPanel />}
    </div>
  );
}

// ================= PEMINJAMAN =================
interface CartItem {
  copyId: number;
  inventoryCode: string;
  book: Book;
}

function BorrowPanel() {
  const toast = useToast();
  const [identifier, setIdentifier] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [settings, setSettings] = useState<{ loanDays: number; quotaSiswa: number; quotaGuru: number }>({
    loanDays: 7, quotaSiswa: 2, quotaGuru: 5,
  });
  const [memberLoading, setMemberLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [copyCode, setCopyCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const copyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => {
        const s = res.data.data;
        setSettings({
          loanDays: parseInt(s.loan_days ?? '7', 10),
          quotaSiswa: parseInt(s.max_loans_siswa ?? '2', 10),
          quotaGuru: parseInt(s.max_loans_guru ?? '5', 10),
        });
      })
      .catch(() => {});
  }, []);

  const findMember = async (raw: string) => {
    const id = parseMemberQr(raw);
    if (!id) {
      toast('error', 'QR tidak dikenali sebagai kartu siswa');
      return;
    }
    setMemberLoading(true);
    try {
      const res = await api.get('/members', { params: { q: id, role: 'all', status: 'active' } });
      const found: Member | undefined = res.data.data.find(
        (m: Member) => m.identifier.toLowerCase() === id.toLowerCase()
      );
      if (!found) {
        toast('error', `Anggota "${id}" tidak ditemukan atau tidak aktif`);
        setMember(null);
      } else if (found.role === 'admin') {
        toast('error', 'Akun pustakawan tidak dapat meminjam');
        setMember(null);
      } else {
        setMember(found);
        setCart([]);
        toast('success', `Siswa/Guru: ${found.name}`);
        setTimeout(() => copyInputRef.current?.focus(), 50);
      }
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setMemberLoading(false);
      setIdentifier('');
    }
  };

  const addCopy = async (raw: string) => {
    const code = parseCopyQr(raw);
    if (!code || !member) return;
    if (cart.length >= (member.role === 'guru' ? settings.quotaGuru : settings.quotaSiswa) - member.activeLoans) {
      toast('error', 'Kuota peminjaman anggota ini sudah tercapai');
      return;
    }
    try {
      const res = await api.get(`/books/copies/lookup/${encodeURIComponent(code)}`);
      const { copy, book, activeLoan } = res.data.data;
      if (copy.status !== 'available') {
        toast('error', activeLoan ? `Eksemplar sedang dipinjam oleh ${activeLoan.user.name}` : `Eksemplar tidak tersedia (${copy.status})`);
        return;
      }
      if (cart.some((c) => c.copyId === copy.id)) {
        toast('error', 'Eksemplar sudah ada di daftar');
        return;
      }
      setCart((prev) => [...prev, { copyId: copy.id, inventoryCode: copy.inventoryCode, book }]);
      toast('success', `${book.title} ditambahkan`);
      setCopyCode('');
    } catch (e) {
      toast('error', errMessage(e, 'Kode inventaris tidak ditemukan'));
      setCopyCode('');
    }
  };

  const process = async () => {
    if (!member || cart.length === 0) return;
    setProcessing(true);
    let okCount = 0;
    for (const item of cart) {
      try {
        await api.post('/loans', { userId: member.id, copyId: item.copyId });
        okCount++;
      } catch (e) {
        toast('error', `${item.book.title}: ${errMessage(e)}`);
      }
    }
    setProcessing(false);
    if (okCount > 0) {
      toast('success', `${okCount} peminjaman berhasil dicatat`);
      setCart([]);
      // refresh status kuota anggota
      api
        .get('/members', { params: { q: member.identifier, role: 'all', status: 'active' } })
        .then((res) => {
          const found = res.data.data.find((m: Member) => m.id === member.id);
          if (found) setMember(found);
        })
        .catch(() => {});
    }
  };

  const quota = member ? (member.role === 'guru' ? settings.quotaGuru : settings.quotaSiswa) : 0;
  const quotaLeft = member ? quota - member.activeLoans - cart.length : null;
  const today = new Date();
  const dueDate = new Date(today.getTime() + settings.loanDays * 86400000);

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      {/* LANGKAH 1 — Scan Kartu Siswa */}
      <Card className="h-fit p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-500">
          <IdCard size={16} /> Langkah 1 · Scan Kartu Siswa
        </h2>
        <QrScanner onScan={findMember} label="QR Kartu Siswa" />
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            findMember(identifier);
          }}
        >
          <Input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="…atau ketik NIS/NIP lalu Enter"
          />
          <Button type="submit" loading={memberLoading} className="shrink-0 px-4">Cari</Button>
        </form>

        {member && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
              <UserCheck size={22} className="shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-stone-900">{member.name}</p>
                <p className="text-xs text-stone-500">
                  NIS/NIP: {member.identifier} · {member.classOrPosition ?? member.role}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-stone-50 p-3">
                <p className="text-xs text-stone-500">Sedang Pinjam</p>
                <p className="text-xl font-extrabold text-stone-900">{member.activeLoans}</p>
              </div>
              <div className="rounded-xl bg-brand-50 p-3">
                <p className="text-xs text-stone-500">Sisa Kuota</p>
                <p className={`text-xl font-extrabold ${(quotaLeft ?? 0) <= 0 ? 'text-red-600' : 'text-brand-700'}`}>
                  {quotaLeft ?? '-'}
                </p>
              </div>
            </div>
            <MemberFineStatus memberId={member.id} />
          </div>
        )}
      </Card>

      {/* LANGKAH 2 — Scan Buku + detail + konfirmasi */}
      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-500">
          <Barcode size={16} /> Langkah 2 · Scan Buku
        </h2>
        <QrScanner onScan={addCopy} label="QR / Barcode Buku" disabled={!member} />
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addCopy(copyCode);
          }}
        >
          <div className="relative flex-1">
            <Barcode size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              ref={copyInputRef}
              value={copyCode}
              onChange={(e) => setCopyCode(e.target.value)}
              placeholder="…atau ketik kode inventaris (mis. SIP-2026-0002) lalu Enter"
              className="pl-10"
              disabled={!member}
            />
          </div>
          <Button type="submit" disabled={!member} className="shrink-0 px-4">Tambah</Button>
        </form>

        {!member ? (
          <p className="py-8 text-center text-sm text-stone-500">Selesaikan Langkah 1 — scan kartu siswa terlebih dahulu.</p>
        ) : cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-500">Belum ada buku. Scan QR / barcode buku yang akan dipinjam.</p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-stone-100">
              {cart.map((item) => (
                <li key={item.copyId} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-stone-800">{item.book.title}</p>
                    <p className="font-mono text-xs text-stone-400">{item.inventoryCode}</p>
                  </div>
                  <Badge label="Tersedia" cls="bg-emerald-100 text-emerald-700" />
                  <button
                    className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                    onClick={() => setCart((prev) => prev.filter((c) => c.copyId !== item.copyId))}
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>

            {/* Detail peminjaman (mockup §4) */}
            <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-stone-50 p-4 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-stone-500"><CalendarDays size={12} /> Tanggal Pinjam</p>
                <p className="text-sm font-bold text-stone-800">{tanggal(today)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-stone-500"><CalendarDays size={12} /> Jatuh Tempo</p>
                <p className="text-sm font-bold text-brand-700">{tanggal(dueDate)} <span className="font-medium text-stone-400">({settings.loanDays} hari)</span></p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Jumlah Buku</p>
                <p className="text-sm font-bold text-stone-800">{cart.length} eksemplar</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
              <p className="text-sm text-stone-600">Petugas: <b>{member.name}</b></p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCart([])}>Kosongkan</Button>
                <Button loading={processing} onClick={process}>
                  <CheckCircle2 size={16} /> Konfirmasi Peminjaman
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/** Cek denda anggota (FR-18) — sistem menolak peminjaman saat konfirmasi. */
function MemberFineStatus({ memberId }: { memberId: number }) {
  const [state, setState] = useState<'loading' | 'clean' | 'debt'>('loading');
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setState('loading');
    api
      .get('/fines')
      .then((res) => {
        const memberFines = (res.data.data as any[]).filter(
          (f) => f.status === 'unpaid' && f.loan?.user?.id === memberId
        );
        if (memberFines.length) {
          setState('debt');
          setCount(memberFines.length);
          setTotal(memberFines.reduce((s, f) => s + Number(f.amount), 0));
        } else setState('clean');
      })
      .catch(() => setState('clean'));
  }, [memberId]);

  if (state === 'loading') return <Spinner />;
  if (state === 'clean') {
    return (
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
        ✓ Tidak ada denda tertunggak
      </p>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
      <AlertTriangle size={16} className="shrink-0" />
      {count} denda belum lunas ({rupiah(total)}) — sistem akan menolak peminjaman
    </div>
  );
}

// ================= PENGEMBALIAN =================
interface LookupResult {
  copy: { id: number; inventoryCode: string; status: string };
  book: Book;
  activeLoan: { id: number; loanDate: string; dueDate: string; user: { name: string; identifier: string } } | null;
}

function ReturnPanel() {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [recent, setRecent] = useState<Loan[]>([]);

  const lookup = async (raw?: string) => {
    const value = parseCopyQr(raw ?? code);
    if (!value) return;
    try {
      const res = await api.get(`/books/copies/lookup/${encodeURIComponent(value)}`);
      setResult(res.data.data);
      setCode('');
      if (!res.data.data.activeLoan) {
        toast('error', 'Eksemplar ini tidak sedang dipinjam');
      }
    } catch (e) {
      toast('error', errMessage(e, 'Kode inventaris tidak ditemukan'));
      setCode('');
    }
  };

  const doReturn = async () => {
    if (!result?.activeLoan) return;
    setProcessing(true);
    try {
      const res = await api.put('/loans/return-by-code', { copyCode: result.copy.inventoryCode });
      toast('success', res.data.message);
      setResult(null);
      setRecent((prev) => [res.data.data.loan, ...prev].slice(0, 5));
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card className="p-5">
        <QrScanner onScan={(text) => lookup(text)} label="QR / Barcode Buku Dikembalikan" />
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
        >
          <div className="relative flex-1">
            <Barcode size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="…atau ketik kode eksemplar lalu Enter"
              className="pl-10"
              autoFocus
            />
          </div>
          <Button type="submit" className="shrink-0 px-4">Cek</Button>
        </form>

        {!result ? (
          <p className="py-10 text-center text-sm text-stone-500">
            Scan QR buku yang dikembalikan — sistem menampilkan peminjam, tanggal, dan keterlambatan.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-stone-200 p-4">
              <p className="text-sm font-extrabold text-stone-900">{result.book.title}</p>
              <p className="text-xs text-stone-500">{result.book.author}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge {...STATUS_COPY[result.copy.status as keyof typeof STATUS_COPY]} />
                <span className="font-mono text-xs text-stone-400">{result.copy.inventoryCode}</span>
              </div>
            </div>

            {result.activeLoan ? (
              <div className="space-y-3 rounded-xl bg-stone-50 p-4">
                <p className="text-sm">
                  Dipinjam oleh <b>{result.activeLoan.user.name}</b> ({result.activeLoan.user.identifier})
                </p>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white p-2.5">
                    <p className="text-stone-500">Tgl Pinjam</p>
                    <p className="font-bold text-stone-800">{tanggal(result.activeLoan.loanDate)}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2.5">
                    <p className="text-stone-500">Jatuh Tempo</p>
                    <p className="font-bold text-stone-800">{tanggal(result.activeLoan.dueDate)}</p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${new Date(result.activeLoan.dueDate) < new Date() ? 'text-red-600' : 'text-stone-600'}`}>
                  {deskripsiTenggat(result.activeLoan.dueDate)}
                  {new Date(result.activeLoan.dueDate) < new Date() && ' — denda dihitung otomatis (FR-20)'}
                </p>
                <Button className="w-full" loading={processing} onClick={doReturn}>
                  <RefreshCw size={16} /> Konfirmasi Pengembalian
                </Button>
              </div>
            ) : (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                Eksemplar ini tidak sedang dipinjam (status: {result.copy.status}).
              </p>
            )}
          </div>
        )}
      </Card>

      <Card className="h-fit p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">Baru Diproses</h2>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-xs text-stone-400">Belum ada pengembalian di sesi ini.</p>
        ) : (
          <ul className="space-y-2.5">
            {recent.map((loan) => (
              <li key={loan.id} className="rounded-xl bg-emerald-50 p-3 text-sm">
                <p className="font-bold text-stone-800">{loan.bookCopy?.book?.title}</p>
                <p className="text-xs text-stone-500">
                  {loan.user?.name} · kembali {tanggal(loan.returnDate)}
                  {loan.fines && loan.fines.length > 0 && (
                    <span className="ml-1 font-bold text-red-600">· denda {rupiah(loan.fines[0].amount)}</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
