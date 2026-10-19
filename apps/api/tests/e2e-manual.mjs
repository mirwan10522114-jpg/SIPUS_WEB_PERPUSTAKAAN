/* Uji alur end-to-end SIPUS terhadap API yang sedang berjalan (localhost:3000). */
const BASE = 'http://localhost:3001/api';
let pass = 0;
let fail = 0;

function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

(async () => {
  console.log('=== SIPUS E2E ===');

  // --- 1. Login admin ---
  const adminLogin = await api('POST', '/auth/login', { body: { identifier: 'ADM001', password: 'admin123' } });
  ok('Login admin (ADM001)', adminLogin.status === 200 && adminLogin.json.data.accessToken);
  const admin = adminLogin.json.data.accessToken;

  // --- 2. Dashboard ---
  const dash = await api('GET', '/dashboard/stats', { token: admin });
  ok('Dashboard stats (admin)', dash.status === 200 && dash.json.data.totalBooks > 0);

  // --- 3. RBAC ---
  const forbidden = await api('GET', '/members', {});
  ok('Akses /members tanpa token → 401', forbidden.status === 401);

  // --- 4. Rizky (2026003) punya denda unpaid → pinjam ditolak (FR-18) ---
  const blocked = await api('POST', '/loans', { token: admin, body: { userIdentifier: '2026003', copyCode: 'SIP-2026-0002' } });
  ok('Pinjam diblokir karena denda belum lunas (FR-18)', blocked.status === 403, `status=${blocked.status} msg=${blocked.json?.message}`);

  // --- 5. Lunasi denda Rizky (FR-25) ---
  const fines = await api('GET', '/fines', { token: admin });
  const rizkyFine = fines.json.data.find(
    (f) => f.status === 'unpaid' && f.loan?.user?.identifier === '2026003'
  );
  ok('Denda unpaid Rizky ditemukan (hasil seed)', !!rizkyFine);
  if (rizkyFine) {
    const paid = await api('PUT', `/fines/${rizkyFine.id}/pay`, { token: admin });
    ok('Tandai denda lunas (FR-25)', paid.status === 200);
  }

  // --- 6. Buat peminjaman baru via scan (FR-16/17) ---
  const loan = await api('POST', '/loans', { token: admin, body: { userIdentifier: '2026003', copyCode: 'SIP-2026-0002' } });
  ok('Peminjaman dibuat', loan.status === 201, `status=${loan.status} msg=${JSON.stringify(loan.json)}`);
  const loanId = loan.json?.data?.id;
  const dueDate = loan.json?.data?.dueDate ? new Date(loan.json.data.dueDate) : null;
  const loanDate = loan.json?.data?.loanDate ? new Date(loan.json.data.loanDate) : null;
  const diffDays = dueDate && loanDate ? Math.round((dueDate - loanDate) / 86400000) : 0;
  ok('Jatuh tempo otomatis = loan_date + 7 hari (FR-17)', diffDays === 7, `diff=${diffDays}`);

  // --- 7. Kuota siswa: siswa1 (2026001) sudah pinjam 1 dari kuota 2; coba pinjam 2 lagi → ditolak di yang kedua
  // (satu tersedia dipinjam dulu)
  const l2 = await api('POST', '/loans', { token: admin, body: { userIdentifier: '2026001', copyCode: 'SIP-2026-0003' } });
  ok('Peminjaman kedua Andi dibuat', l2.status === 201, `status=${l2.status}`);
  const l3 = await api('POST', '/loans', { token: admin, body: { userIdentifier: '2026001', copyCode: 'SIP-2026-0004' } });
  ok('Peminjaman ketiga melebihi kuota siswa → 403 (FR-14)', l3.status === 403, `status=${l3.status} msg=${l3.json?.message}`);

  // --- 8. Pengembalian terlambat → denda otomatis (FR-19/20) ---
  // Backdate due_date menjadi 5 hari lalu via Prisma tidak bisa dari sini;
  // gunakan endpoint return lalu cek: karena due_date masih masa depan, denda = 0.
  // Untuk menguji denda, kita kembalikan peminjaman overdue milik Dewi (seed, telat 5 hari):
  const overdueList = await api('GET', '/reports/overdue', { token: admin });
  const dewiLoan = overdueList.json.data.find((l) => l.user?.identifier === '2026002');
  ok('Laporan overdue berisi pinjaman Dewi (seed)', !!dewiLoan, JSON.stringify(overdueList.json?.data?.slice(0, 1)));
  ok('Perhitungan hari terlambat = 5', dewiLoan?.lateDays === 5, `lateDays=${dewiLoan?.lateDays}`);
  ok('Estimasi denda = 5 × 1000 = 5000', dewiLoan?.estimatedFine === 5000, `est=${dewiLoan?.estimatedFine}`);

  const ret = await api('PUT', `/loans/${dewiLoan.id}/return`, { token: admin });
  ok('Pengembalian Dewi dicatat', ret.status === 200, JSON.stringify(ret.json?.message));
  ok('Denda otomatis terbit 5×1000=5000 (FR-20)', ret.json?.data?.fine && Number(ret.json.data.fine.amount) === 5000, JSON.stringify(ret.json?.data?.fine));

  // --- 9. Reservasi (FR-21) ---
  // Cari buku yang seluruh eksemplarnya sedang dipinjam (status=unavailable)
  const unavailable = await api('GET', '/books?status=unavailable&limit=5');
  const habis = unavailable.json.data[0];
  ok('Ada buku yang seluruh eksemplarnya dipinjam', !!habis, `total=${unavailable.json.meta?.total}`);
  const reserve = await api('POST', '/reservations', { token: admin, body: { bookId: habis.id } });
  ok(`Reservasi buku "${habis.title}" dibuat (FR-21)`, reserve.status === 201, JSON.stringify(reserve.json?.message));
  const resId = reserve.json?.data?.id;
  ok('Status awal waiting', reserve.json?.data?.status === 'waiting');

  // Buku yang masih tersedia tidak boleh direservasi
  const search2 = await api('GET', '/books?q=Filosofi%20Teras');
  const filosofi = search2.json.data[0];
  const badRes = await api('POST', '/reservations', { token: admin, body: { bookId: filosofi.id } });
  ok('Reservasi buku yang masih tersedia → 409', badRes.status === 409, `status=${badRes.status}`);

  // --- 10. Cancel reservasi ---
  const cancel = await api('PUT', `/reservations/${resId}/cancel`, { token: admin });
  ok('Batalkan reservasi', cancel.status === 200);

  // --- 11. Notifikasi ---
  const notif = await api('GET', '/notifications/me', { token: admin });
  ok('Notifikasi milik sendiri', notif.status === 200 && Array.isArray(notif.json.data));

  // --- 12. Laporan ---
  const popular = await api('GET', '/reports/popular-books', { token: admin });
  ok('Laporan buku terpopuler (FR-27)', popular.status === 200 && popular.json.data.length > 0);
  const tx = await api('GET', '/reports/transactions?period=day', { token: admin });
  ok('Laporan transaksi harian (FR-29)', tx.status === 200 && tx.json.data.length === 14);

  // Export Excel (FR-30)
  const xlsx = await fetch(BASE + '/reports/export?type=popular&period=month', { headers: { Authorization: `Bearer ${admin}` } });
  const buf = Buffer.from(await xlsx.arrayBuffer());
  ok('Export Excel terunduh (FR-30)', xlsx.status === 200 && buf.length > 1000 && xlsx.headers.get('content-type').includes('spreadsheetml'));

  // --- 13. Settings (super_admin only) ---
  const setBlocked = await api('PUT', '/settings', { token: admin, body: { settings: [{ key: 'fine_per_day', value: '2000' }] } });
  ok('Admin biasa tidak boleh ubah settings → 403', setBlocked.status === 403, `status=${setBlocked.status}`);
  const saLogin = await api('POST', '/auth/login', { body: { identifier: 'SA001', password: 'superadmin123' } });
  const sa = saLogin.json.data.accessToken;
  const setOk = await api('PUT', '/settings', { token: sa, body: { settings: [{ key: 'fine_per_day', value: '2000' }] } });
  ok('Super Admin ubah tarif denda (FR-24)', setOk.status === 200);
  // kembalikan ke 1000
  await api('PUT', '/settings', { token: sa, body: { settings: [{ key: 'fine_per_day', value: '1000' }] } });

  // --- 14. Import CSV anggota (FR-15) ---
  const csv = 'identifier,name,email,role,class_or_position,password\n2026999,Siswa Import Test,,siswa,X-Import,siswa123\n';
  const impRes = await fetch(BASE + '/members/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'multipart/form-data; boundary=X' },
    body: `--X\r\nContent-Disposition: form-data; name="file"; filename="members.csv"\r\nContent-Type: text/csv\r\n\r\n${csv}\r\n--X--`,
  });
  const imp = await impRes.json();
  ok('Import CSV anggota (FR-15)', impRes.status === 200 && imp.data?.created === 1, JSON.stringify(imp));

  // --- 15. Import member bisa login ---
  const newLogin = await api('POST', '/auth/login', { body: { identifier: '2026999', password: 'siswa123' } });
  ok('Anggota hasil import dapat login', newLogin.status === 200);

  console.log(`\n=== Hasil: ${pass} lulus, ${fail} gagal ===`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
