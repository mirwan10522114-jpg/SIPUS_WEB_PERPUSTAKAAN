import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, ScanLine } from 'lucide-react';

/**
 * Scanner QR/Barcode via kamera (html5-qrcode).
 * Dipakai di meja sirkulasi: scan kartu siswa & scan buku (PRD §13).
 * Scanner hardware (barcode USB) tetap didukung lewat input manual + Enter.
 */
export function QrScanner({
  onScan,
  label,
  disabled,
}: {
  onScan: (text: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const elementId = useId().replace(/[:]/g, '');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const runningRef = useRef(false);
  const lastScanRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = async () => {
    const scanner = scannerRef.current;
    if (scanner && runningRef.current) {
      runningRef.current = false;
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // kamera mungkin sudah mati sendiri
      }
    }
    scannerRef.current = null;
    setActive(false);
  };

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    if (disabled || runningRef.current) return;
    setError(null);
    try {
      const scanner = new Html5Qrcode(elementId, { verbose: false });
      scannerRef.current = scanner;
      runningRef.current = true;
      setActive(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decodedText) => {
          const now = Date.now();
          // abaikan hasil scan yang sama dalam 2,5 detik (anti duplikat)
          if (lastScanRef.current.text === decodedText && now - lastScanRef.current.at < 2500) return;
          lastScanRef.current = { text: decodedText, at: now };
          onScan(decodedText.trim());
        },
        () => {
          // frame tanpa QR — abaikan (dipanggil terus-menerus)
        }
      );
    } catch (e: any) {
      runningRef.current = false;
      setActive(false);
      const msg =
        e?.message?.includes('Permission') || e?.name === 'NotAllowedError'
          ? 'Akses kamera ditolak. Izinkan kamera di browser atau gunakan input manual.'
          : e?.message?.includes('NotFound') || e?.name === 'NotFoundError'
            ? 'Kamera tidak ditemukan pada perangkat ini. Gunakan input manual.'
            : 'Kamera gagal dibuka. Gunakan input manual atau scanner USB.';
      setError(msg);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-800">
          <ScanLine size={14} /> {label ?? 'Scan QR'}
        </p>
        {active ? (
          <button
            type="button"
            onClick={stop}
            className="flex min-h-9 items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200"
          >
            <CameraOff size={13} /> Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-800 disabled:opacity-50"
          >
            <Camera size={13} /> Mulai Kamera
          </button>
        )}
      </div>

      <div id={elementId} className={`overflow-hidden rounded-lg ${active ? 'block' : 'hidden'}`} />

      {!active && (
        <div className="flex h-36 items-center justify-center rounded-lg bg-white/70 text-center">
          <p className="max-w-56 text-xs text-stone-400">
            {disabled
              ? 'Selesaikan langkah sebelumnya terlebih dahulu.'
              : 'Tekan "Mulai Kamera" lalu arahkan QR ke kamera.'}
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
