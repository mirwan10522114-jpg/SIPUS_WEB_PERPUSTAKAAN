import QRCode from 'qrcode';

/** Generate gambar QR (data URL) untuk kartu siswa / label buku. */
export async function makeQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#134e4a', light: '#ffffff' },
  });
}

/**
 * Format isi QR yang dipakai SIPUS:
 * - Kartu siswa : SIPUS:SISWA:<NIS>
 * - Label buku  : SIPUS:BUKU:<kode inventaris>
 * Teks polos (mis. hasil scanner hardware) tetap diterima apa adanya.
 */
export function memberQrValue(identifier: string): string {
  return `SIPUS:SISWA:${identifier}`;
}

export function copyQrValue(inventoryCode: string): string {
  return `SIPUS:BUKU:${inventoryCode}`;
}

/** Ambil identifier anggota dari hasil scan QR kartu siswa. */
export function parseMemberQr(text: string): string {
  const t = text.trim();
  if (t.toUpperCase().startsWith('SIPUS:')) {
    const parts = t.split(':');
    if (parts.length >= 3 && parts[1].toUpperCase() === 'SISWA') return parts.slice(2).join(':').trim();
    return '';
  }
  return t;
}

/** Ambil kode inventaris dari hasil scan QR label buku. */
export function parseCopyQr(text: string): string {
  const t = text.trim();
  if (t.toUpperCase().startsWith('SIPUS:')) {
    const parts = t.split(':');
    if (parts.length >= 3 && parts[1].toUpperCase() === 'BUKU') return parts.slice(2).join(':').trim();
    return '';
  }
  return t;
}

/** Buka jendela cetak berisi label QR siap tempel. */
export async function printQrLabels(
  items: Array<{ title: string; subtitle: string; qrDataUrl: string }>,
  docTitle: string
): Promise<void> {
  const win = window.open('', '_blank', 'width=860,height=700');
  if (!win) throw new Error('Popup diblokir browser — izinkan popup untuk mencetak.');
  const labels = items
    .map(
      (it) => `
      <div class="label">
        <img src="${it.qrDataUrl}" alt="QR" />
        <p class="title">${escapeHtml(it.title)}</p>
        <p class="subtitle">${escapeHtml(it.subtitle)}</p>
      </div>`
    )
    .join('');
  win.document.write(`<!doctype html>
<html lang="id"><head><meta charset="utf-8" /><title>${escapeHtml(docTitle)}</title>
<style>
  body { font-family: "Segoe UI", Arial, sans-serif; padding: 16px; }
  h1 { font-size: 15px; color: #134e4a; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .label { border: 1px dashed #9ca3af; border-radius: 10px; padding: 10px; text-align: center; page-break-inside: avoid; }
  .label img { width: 130px; height: 130px; }
  .title { font-size: 12px; font-weight: 700; margin: 6px 0 2px; }
  .subtitle { font-size: 11px; color: #57534e; margin: 0; font-family: monospace; }
  @media print { .no-print { display: none; } }
</style></head>
<body>
  <h1>${escapeHtml(docTitle)}</h1>
  <div class="grid">${labels}</div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
