/**
 * Seed data SIPUS — akun contoh, katalog buku, transaksi, pengumuman.
 * Jalankan: npm run db:seed
 */
import { PrismaClient, Role, CopyStatus, LoanStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

async function main() {
  console.log('🌱 Seeding SIPUS...');

  // ---------- Settings ----------
  const settings: Array<[string, string]> = [
    ['fine_per_day', '1000'],
    ['loan_days', '7'],
    ['max_loans_siswa', '2'],
    ['max_loans_guru', '5'],
    ['reservation_hold_days', '2'],
    ['library_name', 'Perpustakaan SMA Negeri 1 Nusantara'],
  ];
  for (const [key, value] of settings) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // ---------- Users ----------
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const superAdmin = await prisma.user.upsert({
    where: { identifier: 'SA001' },
    update: {},
    create: {
      identifier: 'SA001', name: 'Administrator Sistem', email: 'superadmin@sipus.sch.id',
      passwordHash: hash('superadmin123'), role: 'super_admin' as Role, classOrPosition: 'Admin IT',
    },
  });
  const admin = await prisma.user.upsert({
    where: { identifier: 'ADM001' },
    update: {},
    create: {
      identifier: 'ADM001', name: 'Ratna Dewi, S.IP.', email: 'admin@sipus.sch.id',
      passwordHash: hash('admin123'), role: 'admin' as Role, classOrPosition: 'Kepala Perpustakaan',
    },
  });
  const guru1 = await prisma.user.upsert({
    where: { identifier: 'G001' },
    update: {},
    create: {
      identifier: 'G001', name: 'Budi Santoso, S.Pd.', email: 'budi@sipus.sch.id',
      passwordHash: hash('guru123'), role: 'guru' as Role, classOrPosition: 'Guru Biologi',
    },
  });
  const siswa1 = await prisma.user.upsert({
    where: { identifier: '2026001' },
    update: {},
    create: {
      identifier: '2026001', name: 'Andi Pratama', email: 'andi@siswa.sipus.sch.id',
      passwordHash: hash('siswa123'), role: 'siswa' as Role, classOrPosition: 'X-1',
    },
  });
  const siswa2 = await prisma.user.upsert({
    where: { identifier: '2026002' },
    update: {},
    create: {
      identifier: '2026002', name: 'Dewi Lestari', email: 'dewi@siswa.sipus.sch.id',
      passwordHash: hash('siswa123'), role: 'siswa' as Role, classOrPosition: 'XI-2',
    },
  });
  const siswa3 = await prisma.user.upsert({
    where: { identifier: '2026003' },
    update: {},
    create: {
      identifier: '2026003', name: 'Rizky Ramadhan',
      passwordHash: hash('siswa123'), role: 'siswa' as Role, classOrPosition: 'XII-1 IPA',
    },
  });
  await prisma.user.upsert({
    where: { identifier: 'G002' },
    update: {},
    create: {
      identifier: 'G002', name: 'Sari Wulandari, S.Pd.', email: 'sari@sipus.sch.id',
      passwordHash: hash('guru123'), role: 'guru' as Role, classOrPosition: 'Guru Bahasa Indonesia',
    },
  });

  // ---------- Categories ----------
  const catNames = ['Buku Pelajaran', 'Fiksi', 'Sains', 'Sejarah & Geografi', 'Bahasa', 'Pengembangan Diri'];
  const cats: Record<string, { id: number }> = {};
  for (const name of catNames) {
    cats[name] = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, description: `Koleksi kategori ${name}` },
    });
  }

  // ---------- Books & copies ----------
  type BookSeed = {
    isbn: string; title: string; author: string; publisher: string; year: number;
    category: string; description: string; copies: number; shelf: string;
  };
  const books: BookSeed[] = [
    { isbn: '9786022910609', title: 'Laskar Pelangi', author: 'Andrea Hirata', publisher: 'Bentang Pustaka', year: 2005, category: 'Fiksi', description: 'Kisah sepuluh anak Belitung yang berjuang menempuh pendidikan di sekolah Muhammadiyah.', copies: 3, shelf: 'RAK F-01' },
    { isbn: '9786022910616', title: 'Sang Pemimpi', author: 'Andrea Hirata', publisher: 'Bentang Pustaka', year: 2006, category: 'Fiksi', description: 'Kelanjutan kisah Ikal dan Arai mengejar mimpi di genting.', copies: 2, shelf: 'RAK F-01' },
    { isbn: '9786020324493', title: 'Bumi', author: 'Tere Liye', publisher: 'Gramedia Pustaka Utama', year: 2014, category: 'Fiksi', description: 'Petualangan Raib, Seli, dan Ali di dunia paralel.', copies: 2, shelf: 'RAK F-02' },
    { isbn: '9789797806147', title: 'Negeri 5 Menara', author: 'A. Fuadi', publisher: 'Gramedia', year: 2009, category: 'Fiksi', description: 'Perjalanan Alif santri PPN Jepara yang bermimpi ke luar negeri.', copies: 2, shelf: 'RAK F-02' },
    { isbn: '9786024246946', title: 'Perahu Kertas', author: 'Dee Lestari', publisher: 'Bentang Pustaka', year: 2009, category: 'Fiksi', description: 'Kisah Kugy dan Keenan yang saling mencari di tengah gelombang kehidupan.', copies: 2, shelf: 'RAK F-03' },
    { isbn: '9786024248131', title: 'Filosofi Teras', author: 'Henry Manampiring', publisher: 'Kompas', year: 2018, category: 'Pengembangan Diri', description: 'Pengantar Stoisisme untuk kehidupan modern yang penuh tekanan.', copies: 3, shelf: 'RAK P-01' },
    { isbn: '9786020333112', title: 'Atomic Habits', author: 'James Clear', publisher: 'Gramedia', year: 2019, category: 'Pengembangan Diri', description: 'Perubahan kecil yang memberikan hasil luar biasa melalui kebiasaan atomik.', copies: 3, shelf: 'RAK P-01' },
    { isbn: '9786024241668', title: 'Matematika SMA/MA Kelas X', author: 'Kemendikbudristek', publisher: 'Pusat Kurikulum', year: 2021, category: 'Buku Pelajaran', description: 'Buku teks Matematika kurikulum merdeka untuk kelas X.', copies: 4, shelf: 'RAK PEL-MAT' },
    { isbn: '9786024241675', title: 'Fisika SMA/MA Kelas XI', author: 'Kemendikbudristek', publisher: 'Pusat Kurikulum', year: 2021, category: 'Buku Pelajaran', description: 'Buku teks Fisika kurikulum merdeka untuk kelas XI.', copies: 3, shelf: 'RAK PEL-FIS' },
    { isbn: '9786024241682', title: 'Kimia SMA/MA Kelas XII', author: 'Kemendikbudristek', publisher: 'Pusat Kurikulum', year: 2021, category: 'Buku Pelajaran', description: 'Buku teks Kimia kurikulum merdeka untuk kelas XII.', copies: 3, shelf: 'RAK PEL-KIM' },
    { isbn: '9786024241691', title: 'Biologi SMA/MA Kelas X', author: 'Kemendikbudristek', publisher: 'Pusat Kurikulum', year: 2021, category: 'Buku Pelajaran', description: 'Buku teks Biologi kurikulum merdeka untuk kelas X.', copies: 3, shelf: 'RAK PEL-BIO' },
    { isbn: '9786024241701', title: 'Geografi SMA/MA Kelas X', author: 'Kemendikbudristek', publisher: 'Pusat Kurikulum', year: 2021, category: 'Sejarah & Geografi', description: 'Buku teks Geografi kurikulum merdeka untuk kelas X.', copies: 2, shelf: 'RAK PEL-GEO' },
    { isbn: '9786024241718', title: 'Sosiologi SMA/MA Kelas XI', author: 'Kemendikbudristek', publisher: 'Pusat Kurikulum', year: 2021, category: 'Buku Pelajaran', description: 'Buku teks Sosiologi kurikulum merdeka untuk kelas XI.', copies: 2, shelf: 'RAK PEL-SOS' },
    { isbn: '9789794337323', title: 'Sejarah Indonesia Modern 1200-2008', author: 'M.C. Ricklefs', publisher: 'Serambi', year: 2008, category: 'Sejarah & Geografi', description: 'Kajian komprehensif perjalanan sejarah Indonesia.', copies: 2, shelf: 'RAK S-01' },
    { isbn: '9786022981039', title: 'Ensiklopedia Sains Umum', author: 'Tim Ensiklopedi Kencana', publisher: 'Kencana', year: 2015, category: 'Sains', description: 'Rujukan ringkas berbagai cabang sains untuk pelajar.', copies: 2, shelf: 'RAK R-01' },
    { isbn: '9786022987277', title: 'Bahasa Indonesia: Ekspresi Diri dan Akademik', author: 'Kemendikbudristek', publisher: 'Pusat Kurikulum', year: 2021, category: 'Bahasa', description: 'Buku teks Bahasa Indonesia kurikulum merdeka.', copies: 4, shelf: 'RAK PEL-BIN' },
    { isbn: '9786022987284', title: 'English for Nusantara', author: 'Kemendikbudristek', publisher: 'Pusat Kurikulum', year: 2021, category: 'Bahasa', description: 'Buku teks Bahasa Inggris kurikulum merdeka.', copies: 4, shelf: 'RAK PEL-BIG' },
    { isbn: '9786024246977', title: 'Ekonomi Makro: Teori dan Pengantar', author: 'Sadono Sukirno', publisher: 'Rajawali Pers', year: 2016, category: 'Buku Pelajaran', description: 'Pengantar teori ekonomi makro untuk pelajar SMA dan umum.', copies: 2, shelf: 'RAK PEL-EKO' },
  ];

  let invSeq = 1;
  const createdBooks: Array<{ id: number; title: string; copyIds: number[] }> = [];
  for (const b of books) {
    const book = await prisma.book.upsert({
      where: { id: 0 },
      update: {},
      create: {
        isbn: b.isbn, title: b.title, author: b.author, publisher: b.publisher,
        publishYear: b.year, categoryId: cats[b.category].id, description: b.description,
      },
    });
    const copyIds: number[] = [];
    for (let i = 0; i < b.copies; i++) {
      const inv = `SIP-2026-${String(invSeq).padStart(4, '0')}`;
      invSeq++;
      const existing = await prisma.bookCopy.findUnique({ where: { inventoryCode: inv } });
      if (existing) { copyIds.push(existing.id); continue; }
      const copy = await prisma.bookCopy.create({
        data: { bookId: book.id, inventoryCode: inv, shelfLocation: `${b.shelf}·${i + 1}`, status: 'available' as CopyStatus },
      });
      copyIds.push(copy.id);
    }
    createdBooks.push({ id: book.id, title: b.title, copyIds });
  }

  const bookByTitle = (t: string) => createdBooks.find((b) => b.title === t)!;

  // ---------- Loans (demo) ----------
  const existingLoans = await prisma.loan.count();
  if (existingLoans === 0) {
    // 1. Andi — pinjaman aktif, jatuh tempo 3 hari lagi
    await prisma.loan.create({
      data: {
        userId: siswa1.id, bookCopyId: bookByTitle('Laskar Pelangi').copyIds[0],
        loanDate: daysFromNow(-4), dueDate: daysFromNow(3),
        status: 'borrowed' as LoanStatus, processedBy: admin.id,
      },
    });
    await prisma.bookCopy.update({ where: { id: bookByTitle('Laskar Pelangi').copyIds[0] }, data: { status: 'borrowed' as CopyStatus } });

    // 2. Dewi — telat 5 hari (overdue)
    await prisma.loan.create({
      data: {
        userId: siswa2.id, bookCopyId: bookByTitle('Bumi').copyIds[0],
        loanDate: daysFromNow(-12), dueDate: daysFromNow(-5),
        status: 'overdue' as LoanStatus, processedBy: admin.id,
      },
    });
    await prisma.bookCopy.update({ where: { id: bookByTitle('Bumi').copyIds[0] }, data: { status: 'borrowed' as CopyStatus } });

    // 3. Rizky — sudah kembali telat 3 hari → denda Rp3.000 belum lunas
    const lateLoan = await prisma.loan.create({
      data: {
        userId: siswa3.id, bookCopyId: bookByTitle('Atomic Habits').copyIds[0],
        loanDate: daysFromNow(-20), dueDate: daysFromNow(-13), returnDate: daysFromNow(-10),
        status: 'returned' as LoanStatus, processedBy: admin.id,
      },
    });
    await prisma.fine.create({
      data: { loanId: lateLoan.id, amount: 3000, reason: 'Terlambat 3 hari', status: 'unpaid' },
    });

    // 4. Andi — riwayat lama, kembali tepat waktu
    await prisma.loan.create({
      data: {
        userId: siswa1.id, bookCopyId: bookByTitle('Filosofi Teras').copyIds[0],
        loanDate: daysFromNow(-30), dueDate: daysFromNow(-23), returnDate: daysFromNow(-24),
        status: 'returned' as LoanStatus, processedBy: admin.id,
      },
    });

    // 5. Guru Budi — pinjam 3 buku sekaligus (kuota guru)
    for (const t of ['Sejarah Indonesia Modern 1200-2008', 'Ensiklopedia Sains Umum', 'Ekonomi Makro: Teori dan Pengantar']) {
      await prisma.loan.create({
        data: {
          userId: guru1.id, bookCopyId: bookByTitle(t).copyIds[0],
          loanDate: daysFromNow(-2), dueDate: daysFromNow(5),
          status: 'borrowed' as LoanStatus, processedBy: admin.id,
        },
      });
      await prisma.bookCopy.update({ where: { id: bookByTitle(t).copyIds[0] }, data: { status: 'borrowed' as CopyStatus } });
    }

    // ---------- Reservation ----------
    await prisma.reservation.create({
      data: { userId: siswa3.id, bookId: bookByTitle('Bumi').id, status: 'waiting' },
    });
  }

  // ---------- Announcements ----------
  const annCount = await prisma.announcement.count();
  if (annCount === 0) {
    await prisma.announcement.createMany({
      data: [
        { title: 'Selamat Datang di Perpustakaan Digital SIPUS', content: 'Sistem informasi perpustakaan kami resmi diluncurkan! Kini Anda dapat mencari buku, melihat riwayat peminjaman, dan mereservasi buku secara online dari mana saja.', publishedBy: admin.id, isActive: true },
        { title: 'Jam Operasional Perpustakaan', content: 'Perpustakaan buka setiap hari kerja pukul 07.00–16.00 WIB. Masa istirahat tetap dibuka untuk pembacaan di tempat.', publishedBy: admin.id, isActive: true },
        { title: 'Lomba Literasi Se-Bulan November', content: 'Ayo ikuti lomba resensi buku dan menulis puisi! Pendaftaran melalui pustakawan. Hadiah menarik menanti.', publishedBy: superAdmin.id, isActive: true },
        { title: 'Perpanjangan Kartu Anggota Angkatan 2024', content: 'Siswa angkatan 2024 agar segera memvalidasi kartu anggota perpustakaan di meja sirkulasi.', publishedBy: admin.id, isActive: false },
      ],
    });
  }

  // ---------- Notifications ----------
  const notifCount = await prisma.notification.count();
  if (notifCount === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: siswa1.id, title: 'Pengingat Jatuh Tempo', message: 'Buku "Laskar Pelangi" akan jatuh tempo dalam 3 hari. Silakan kembalikan tepat waktu untuk menghindari denda.' },
        { userId: siswa2.id, title: 'Buku Terlambat', message: 'Buku "Bumi" telah melewati jatuh tempo 5 hari. Denda terhitung Rp1.000/hari.' },
      ],
    });
  }

  // ---------- Activity logs ----------
  const logCount = await prisma.activityLog.count();
  if (logCount === 0) {
    await prisma.activityLog.createMany({
      data: [
        { userId: admin.id, action: 'SEED_DATA', entityType: 'system' },
        { userId: admin.id, action: 'CREATE_LOAN', entityType: 'loan', entityId: 1 },
      ],
    });
  }

  console.log('✅ Seed selesai.');
  console.log('   Akun demo:  superadmin / superadmin123  ·  admin / admin123  ·  G001 / guru123  ·  2026001 / siswa123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
