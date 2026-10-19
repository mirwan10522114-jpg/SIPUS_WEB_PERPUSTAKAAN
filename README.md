# SIPUS — Sistem Informasi Perpustakaan Sekolah SMA

Aplikasi web untuk mendigitalisasi seluruh operasional perpustakaan sekolah: katalog buku (OPAC),
peminjaman & pengembalian, denda otomatis, reservasi, laporan, dan pengumuman — sesuai PRD v1.0.

**Mobile-first** (dirancang untuk ponsel siswa), seluruh antarmuka berbahasa Indonesia, responsif di
lebar 360px / 768px / 1280px.

---

## Teknologi

| Layer | Teknologi |
|---|---|
| Backend | Node.js + Express + TypeScript (REST API) |
| ORM / DB | Prisma + MySQL 8.x |
| Autentikasi | JWT (access + refresh) + bcrypt |
| Validasi | Zod |
| Frontend | React + Vite + TypeScript + Tailwind CSS v4 |
| Chart / Export | Recharts, ExcelJS (export laporan .xlsx) |
| Testing | Jest + Supertest |
| Dokumentasi API | Swagger UI (`/api/docs`) |

## Struktur

```
├── apps/
│   ├── api/          # REST API (Express + Prisma)
│   │   ├── prisma/   # schema.prisma + seed.ts
│   │   └── src/      # modules/ (auth, books, members, loans, fines,
│   │                 #            reservations, reports, dst), middlewares/, jobs/
│   └── web/          # SPA (React + Vite + Tailwind)
│       └── src/      # pages/ (public, member, admin), components/, api/
└── package.json      # npm workspaces
```

## Menjalankan (Development)

Prasyarat: **Node.js ≥ 20** dan **MySQL 8** berjalan (Laragon: MySQL sudah ikut, aktifkan lewat Laragon).

```bash
# 1. Install dependensi
npm install

# 2. Siapkan konfigurasi lokal (PowerShell)
Copy-Item apps/api/.env.example apps/api/.env
# Sesuaikan DATABASE_URL dan secret JWT di apps/api/.env

# 3. Buat database + tabel + data contoh
npm run db:migrate     # prisma migrate dev (membuat database `sipus` otomatis)
npm run db:seed        # isi data contoh

# 4. Jalankan API (port 3001) & Web (port 5173) sekaligus
npm run dev
```

Buka **http://localhost:5173** untuk aplikasi, **http://localhost:3001/api/docs** untuk dokumentasi API.
> Port API default adalah **3001** agar tidak bentrok dengan Vite/Next.js project lain yang biasa
> memakai 3000. Ubah di `apps/api/.env` (dan proxy di `apps/web/vite.config.ts`) bila perlu.

Jika port 3001 atau 5173 sudah dipakai aplikasi lain, build dan jalankan SIPUS pada satu port
yang kosong. Contoh di PowerShell:

```powershell
npm run build
$env:PORT = '3002'
npm run start -w apps/api
```

Buka **http://localhost:3002**. Frontend dan API dilayani dari port yang sama.

### Skrip lain

| Perintah | Fungsi |
|---|---|
| `npm run build` | Build produksi (API `tsc` + Web `vite build`) |
| `npm test` | Jalankan test (Jest + Supertest) |
| `npm run db:reset` | Reset database (drop + migrate + seed ulang) |

## Akun Demo (hasil seed)

| Peran | NIS/NIP | Password |
|---|---|---|
| Super Admin | `SA001` | `superadmin123` |
| Pustakawan (Admin) | `ADM001` | `admin123` |
| Guru | `G001` | `guru123` |
| Siswa | `2026001` | `siswa123` |
| Siswa | `2026002` | `siswa123` |
| Siswa | `2026003` | `siswa123` |

> **Ganti semua password default sebelum dipakai di sekolah sungguhan.**
> Secret JWT juga wajib diganti di `apps/api/.env` untuk produksi.

## Fitur Utama (pemetaan PRD)

- **Auth & RBAC** — login NIS/NIP + password (bcrypt), JWT access + refresh, 4 role (FR-01..05)
- **Katalog publik (OPAC)** — pencarian judul/penulis/ISBN/penerbit, filter kategori & status,
  pagination (FR-08, FR-11)
- **Buku & eksemplar** — CRUD buku, multi-eksemplar dengan kode inventaris unik (barcode),
  status tersedia/dipinjam/rusak/hilang, unggah cover (FR-06, FR-07, FR-09, FR-10)
- **Anggota** — CRUD, kuota pinjam per role, status aktif, reset password, import massal CSV/XLSX
  (FR-12..15)
- **Sirkulasi dengan QR Code** — alur cepat di meja sirkulasi:
  1. Scan QR **kartu siswa** via kamera → sistem menampilkan nama, NIS/NIP, kuota, status denda
  2. Scan QR **buku** → sistem menampilkan judul, kode inventaris, ketersediaan
  3. Sistem menampilkan detail (tanggal pinjam & jatuh tempo otomatis) → petugas klik **Konfirmasi Peminjaman**
  4. Pengembalian: scan QR buku → detail peminjaman + keterlambatan → **Konfirmasi Pengembalian**
  - Generator QR disediakan: **kartu QR anggota** (Manajemen Anggota → tombol QR) dan
    **label QR eksemplar** siap tempel (Manajemen Buku → Eksemplar → Cetak Semua Label QR)
  - **Halaman uji coba scan**: buka **`/test-qr`** untuk menampilkan semua QR kartu anggota &
    label buku yang siap di-scan dengan kamera (100% offline, tidak butuh internet)
  - Scanner barcode/QR USB tetap didukung melalui input manual + Enter (FR-16, FR-19)
- **Reservasi** — antrean saat semua eksemplar dipinjam, notifikasi in-app saat siap, expired
  otomatis lewat batas ambil (FR-21..23)
- **Denda** — tarif per hari dikonfigurasi admin, tandai lunas, riwayat milik anggota (FR-24..26)
- **Laporan** — buku terpopuler, keterlambatan, transaksi harian/bulanan (grafik), export Excel,
  cetak/PDF via print (FR-27..30)
- **Pengumuman** — CRUD admin, tampil di beranda publik (FR-31, FR-32)
- **Audit** — log aktivitas penting tersimpan di tabel `activity_logs`
- **Cron harian** — penandaan overdue, kedaluwarsa reservasi, pengingat jatuh tempo H-1

## Responsivitas (PRD §9.1)

| Breakpoint | Perilaku |
|---|---|
| < 576px (HP) | Hamburger menu, layout 1 kolom, tabel admin berubah jadi kartu (FR-33), target sentuh ≥ 44px |
| 576–991px (tablet) | Grid katalog 2–3 kolom, sidebar admin tersembunyi (tombol menu) |
| ≥ 992px (desktop) | Sidebar tetap, tabel lengkap, grid katalog 4 kolom |

## Produksi

Build lalu layani frontend dari API (satu proses):

```bash
npm run build
npm run start -w apps/api
```

API dan frontend dilayani pada port `PORT` di `apps/api/.env` (default contoh: **3001**).

- Upload cover tersimpan di `apps/api/uploads/`.
- Gunakan HTTPS di produksi (PRD §15) dan set `NODE_ENV=production` beserta secret JWT yang kuat.
- Jalankan via process manager (pm2 / Laragon autostart) agar uptime terjaga.

## Catatan

- Role "Kepala Sekolah (read-only)" pada PRD §6 mengikuti enum role skema §11.1 (siswa/guru/admin/
  super_admin); kebutuhan melihat laporan tercakup akun admin. Penambahan role khusus dapat menjadi
  pengembangan berikutnya.
- Notifikasi berbentuk **in-app** (lonceng di dashboard); email/WhatsApp belum termasuk fase 1.
