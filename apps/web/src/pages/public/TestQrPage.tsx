import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, IdCard, BookOpen, Info } from 'lucide-react';
import { Card } from '../../components/ui/ui';

interface QrItem {
  title: string;
  subtitle: string;
  badge: string;
  qrText: string;
  qrUrl?: string;
}

const STUDENTS: QrItem[] = [
  { title: 'Andi Pratama', subtitle: 'NIS: 2026001', badge: 'Siswa (X-1)', qrText: 'SIPUS:SISWA:2026001' },
  { title: 'Dewi Lestari', subtitle: 'NIS: 2026002', badge: 'Siswa (XI-2)', qrText: 'SIPUS:SISWA:2026002' },
  { title: 'Rizky Ramadhan', subtitle: 'NIS: 2026003', badge: 'Siswa (XII-1 IPA)', qrText: 'SIPUS:SISWA:2026003' },
  { title: 'Budi Santoso, S.Pd.', subtitle: 'NIP: G001', badge: 'Guru Biologi', qrText: 'SIPUS:SISWA:G001' },
];

const BOOKS: QrItem[] = [
  { title: 'Laskar Pelangi', subtitle: 'Kode: SIP-2026-0001', badge: 'Andrea Hirata', qrText: 'SIPUS:BUKU:SIP-2026-0001' },
  { title: 'Sang Pemimpi', subtitle: 'Kode: SIP-2026-0004', badge: 'Andrea Hirata', qrText: 'SIPUS:BUKU:SIP-2026-0004' },
  { title: 'Bumi', subtitle: 'Kode: SIP-2026-0006', badge: 'Tere Liye', qrText: 'SIPUS:BUKU:SIP-2026-0006' },
  { title: 'Atomic Habits', subtitle: 'Kode: SIP-2026-0015', badge: 'James Clear', qrText: 'SIPUS:BUKU:SIP-2026-0015' },
  { title: 'Filosofi Teras', subtitle: 'Kode: SIP-2026-0012', badge: 'Henry Manampiring', qrText: 'SIPUS:BUKU:SIP-2026-0012' },
];

export function TestQrPage() {
  const [studentQrs, setStudentQrs] = useState<QrItem[]>([]);
  const [bookQrs, setBookQrs] = useState<QrItem[]>([]);

  useEffect(() => {
    const generate = async () => {
      const s = await Promise.all(
        STUDENTS.map(async (item) => ({
          ...item,
          qrUrl: await QRCode.toDataURL(item.qrText, { width: 220, margin: 1 }),
        }))
      );
      const b = await Promise.all(
        BOOKS.map(async (item) => ({
          ...item,
          qrUrl: await QRCode.toDataURL(item.qrText, { width: 220, margin: 1 }),
        }))
      );
      setStudentQrs(s);
      setBookQrs(b);
    };
    generate();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="flex items-center justify-center gap-2.5 text-2xl font-extrabold text-stone-900 sm:text-3xl">
          <QrCode className="text-brand-700" size={28} /> Lembar Tes Scan QR Code
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Gunakan gambar QR Code di bawah untuk di-scan dengan kamera HP / webcam di menu <b>Sirkulasi</b>.
        </p>
      </header>

      <Card className="mb-8 border-brand-200 bg-brand-50/60 p-4">
        <div className="flex items-start gap-3 text-sm text-brand-900">
          <Info size={20} className="mt-0.5 shrink-0 text-brand-700" />
          <div className="space-y-1">
            <p className="font-bold">Cara Menguji Sirkulasi:</p>
            <ol className="list-decimal space-span ml-4 space-y-1 text-xs sm:text-sm">
              <li>
                Buka menu <b>Sirkulasi</b> (<a href="/admin/sirkulasi" className="font-bold text-brand-700 underline">/admin/sirkulasi</a>) di tab lain.
              </li>
              <li>
                Di <b>Langkah 1</b>, klik <b>Mulai Kamera</b> lalu arahkan kamera ke QR Code <b>Kartu Anggota</b> di bawah.
              </li>
              <li>
                Di <b>Langkah 2</b>, klik <b>Mulai Kamera</b> lalu arahkan kamera ke QR Code <b>Label Buku</b> di bawah.
              </li>
              <li>Sistem akan mengenali siswa & buku secara otomatis, lalu klik <b>Konfirmasi Peminjaman</b>!</li>
            </ol>
          </div>
        </div>
      </Card>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-900 border-b border-stone-200 pb-2">
          <IdCard size={20} className="text-brand-700" /> 1. Kartu Anggota (Siswa & Guru)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {studentQrs.map((s) => (
            <Card key={s.qrText} className="flex flex-col items-center p-4 text-center">
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800">
                {s.badge}
              </span>
              <p className="mt-2 font-bold text-stone-900">{s.title}</p>
              <p className="font-mono text-xs text-stone-500">{s.subtitle}</p>
              {s.qrUrl && (
                <img src={s.qrUrl} alt={`QR ${s.title}`} className="my-3 h-44 w-44 rounded-xl border border-stone-100 shadow-sm" />
              )}
              <p className="font-mono text-[10px] text-stone-400">{s.qrText}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-900 border-b border-stone-200 pb-2">
          <BookOpen size={20} className="text-brand-700" /> 2. Label Eksemplar Buku
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookQrs.map((b) => (
            <Card key={b.qrText} className="flex flex-col items-center p-4 text-center">
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-700">
                {b.badge}
              </span>
              <p className="mt-2 font-bold text-stone-900">{b.title}</p>
              <p className="font-mono text-xs text-stone-500">{b.subtitle}</p>
              {b.qrUrl && (
                <img src={b.qrUrl} alt={`QR ${b.title}`} className="my-3 h-44 w-44 rounded-xl border border-stone-100 shadow-sm" />
              )}
              <p className="font-mono text-[10px] text-stone-400">{b.qrText}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
