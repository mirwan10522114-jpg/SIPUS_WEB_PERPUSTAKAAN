import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, KeyRound, Search, Upload, Download, QrCode, Printer } from 'lucide-react';
import { api, errMessage } from '../../api/client';
import type { Member, PaginationMeta } from '../../api/types';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Pagination, Select, Spinner } from '../../components/ui/ui';
import { useToast } from '../../components/ui/Toast';
import { ROLE_LABEL } from '../../utils/format';
import { memberQrValue, makeQrDataUrl, printQrLabels } from '../../utils/qr';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { identifier: '', name: '', email: '', password: '', role: 'siswa', classOrPosition: '', isActive: true };

export function MembersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const isSuper = me?.role === 'super_admin';

  const [members, setMembers] = useState<Member[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [resetTarget, setResetTarget] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [qrTarget, setQrTarget] = useState<Member | null>(null);
  const [qrImg, setQrImg] = useState<string | null>(null);
  const [printingQr, setPrintingQr] = useState(false);

  const showQr = async (m: Member) => {
    setQrTarget(m);
    setQrImg(null);
    try {
      setQrImg(await makeQrDataUrl(memberQrValue(m.identifier)));
    } catch {
      setQrImg(null);
    }
  };

  const printMemberQr = async () => {
    if (!qrTarget) return;
    setPrintingQr(true);
    try {
      await printQrLabels(
        [
          {
            title: qrTarget.name,
            subtitle: `${qrTarget.identifier} · Kartu Anggota Perpustakaan`,
            qrDataUrl: await makeQrDataUrl(memberQrValue(qrTarget.identifier)),
          },
        ],
        'Kartu Anggota — SIPUS'
      );
    } catch (e: any) {
      toast('error', e?.message ?? 'Gagal membuka jendela cetak');
    } finally {
      setPrintingQr(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 15, role };
    if (q) params.q = q;
    api
      .get('/members', { params })
      .then((res) => {
        setMembers(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((e) => toast('error', errMessage(e)))
      .finally(() => setLoading(false));
  }, [page, q, role]);

  useEffect(load, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({
      identifier: m.identifier, name: m.name, email: m.email ?? '', password: '', role: m.role,
      classOrPosition: m.classOrPosition ?? '', isActive: m.isActive,
    });
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/members/${editing.id}`, {
          name: form.name, email: form.email || undefined, role: form.role,
          classOrPosition: form.classOrPosition || undefined, isActive: form.isActive,
        });
        toast('success', 'Data anggota diperbarui');
      } else {
        await api.post('/members', {
          identifier: form.identifier, name: form.name, email: form.email || undefined,
          password: form.password, role: form.role, classOrPosition: form.classOrPosition || undefined,
        });
        toast('success', 'Anggota berhasil ditambahkan');
      }
      setFormOpen(false);
      load();
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (m: Member) => {
    if (!confirm(`Nonaktifkan anggota "${m.name}"? Riwayat transaksi tetap tersimpan.`)) return;
    try {
      await api.delete(`/members/${m.id}`);
      toast('success', 'Anggota dinonaktifkan');
      load();
    } catch (e) {
      toast('error', errMessage(e));
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    try {
      await api.put(`/members/${resetTarget.id}/reset-password`, { newPassword });
      toast('success', `Password ${resetTarget.name} berhasil direset (FR-04)`);
      setResetTarget(null);
      setNewPassword('');
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setResetting(false);
    }
  };

  const doImport = async (file: File) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/members/import', fd);
      const r = res.data.data as { created: number; updated: number; errors: Array<{ row: number; message: string }> };
      toast('success', res.data.message);
      if (r.errors?.length) {
        console.warn('Import errors:', r.errors);
        toast('error', `${r.errors.length} baris gagal — cek console untuk detail`);
      }
      load();
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = [
      'identifier,name,email,role,class_or_position,password',
      '2026101,Contoh Siswa Baru,contoh@siswa.sipus.sch.id,siswa,X-1,siswa123',
      'G003,Contoh Guru Baru,,guru,Guru Fisika,guru123',
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'template-import-anggota.csv';
    a.click();
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Manajemen Anggota</h1>
          <p className="mt-1 text-sm text-stone-500">Kelola data siswa, guru{isSuper ? ', dan akun admin' : ''} (FR-12, FR-13).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
          />
          <Button variant="outline" loading={importing} onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Import
          </Button>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download size={16} /> Template CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} /> Tambah Anggota
          </Button>
        </div>
      </header>

      <Card className="flex flex-col gap-2 p-4 sm:flex-row">
        <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / NIS / NIP / email…" className="pl-10" />
        </form>
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="sm:w-44">
          <option value="all">Semua Peran</option>
          <option value="siswa">Siswa</option>
          <option value="guru">Guru</option>
          <option value="admin">Pustakawan</option>
        </Select>
      </Card>

      {loading ? (
        <Spinner />
      ) : members.length === 0 ? (
        <EmptyState title="Anggota tidak ditemukan" description="Tambahkan anggota atau gunakan fitur import massal (FR-15)." />
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">NIS/NIP</th>
                  <th className="px-4 py-3 font-semibold">Peran</th>
                  <th className="px-4 py-3 font-semibold">Kelas/Jabatan</th>
                  <th className="px-4 py-3 font-semibold">Pinjam</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-stone-900">{m.name}</p>
                      <p className="text-xs text-stone-500">{m.email ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-stone-600">{m.identifier}</td>
                    <td className="px-4 py-3 text-stone-600">{ROLE_LABEL[m.role]}</td>
                    <td className="px-4 py-3 text-stone-600">{m.classOrPosition ?? '-'}</td>
                    <td className="px-4 py-3 text-center font-bold text-stone-800">{m.activeLoans}</td>
                    <td className="px-4 py-3">
                      <Badge label={m.isActive ? 'Aktif' : 'Nonaktif'} cls={m.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => showQr(m)} title="Kartu QR anggota">
                          <QrCode size={14} />
                        </Button>
                        <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => { setResetTarget(m); }}>
                          <KeyRound size={14} />
                        </Button>
                        <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => openEdit(m)}>
                          <Pencil size={14} />
                        </Button>
                        {m.isActive && (
                          <Button variant="danger" className="px-3 py-2 text-xs" onClick={() => deactivate(m)}>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile: kartu (FR-33) */}
          <div className="space-y-3 md:hidden">
            {members.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900">{m.name}</p>
                    <p className="font-mono text-xs text-stone-500">{m.identifier} · {ROLE_LABEL[m.role]}</p>
                    <p className="text-xs text-stone-400">{m.classOrPosition ?? '-'} · pinjam {m.activeLoans} buku</p>
                  </div>
                  <Badge label={m.isActive ? 'Aktif' : 'Nonaktif'} cls={m.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                  <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => showQr(m)}>
                    <QrCode size={14} /> QR
                  </Button>
                  <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => setResetTarget(m)}>
                    <KeyRound size={14} /> Reset PW
                  </Button>
                  <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => openEdit(m)}>
                    <Pencil size={14} /> Edit
                  </Button>
                  {m.isActive && (
                    <Button variant="danger" className="px-3 py-2 text-xs" onClick={() => deactivate(m)}>
                      <Trash2 size={14} /> Nonaktifkan
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />}
        </>
      )}

      {/* Form anggota */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Anggota' : 'Tambah Anggota'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="NIS / NIP" required>
            <Input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required disabled={!!editing} />
          </Field>
          <Field label="Nama Lengkap" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peran" required>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={!!editing && !isSuper}>
                <option value="siswa">Siswa</option>
                <option value="guru">Guru</option>
                {isSuper && <option value="admin">Pustakawan (Admin)</option>}
              </Select>
            </Field>
            <Field label="Kelas / Jabatan">
              <Input value={form.classOrPosition} onChange={(e) => setForm({ ...form, classOrPosition: e.target.value })} placeholder="mis. X-1 / Guru Fisika" />
            </Field>
          </div>
          {!editing && (
            <Field label="Password Awal" required hint="Minimal 6 karakter">
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </Field>
          )}
          {editing && (
            <label className="flex min-h-11 items-center gap-2.5 rounded-xl bg-stone-50 px-3.5 text-sm font-medium text-stone-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-stone-300"
              />
              Akun aktif (dapat login & meminjam)
            </label>
          )}
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}>{editing ? 'Simpan' : 'Tambah'}</Button>
          </div>
        </form>
      </Modal>

      {/* Kartu QR anggota */}
      <Modal open={!!qrTarget} onClose={() => setQrTarget(null)} title="Kartu QR Anggota">
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-6 text-center">
          {qrImg ? (
            <img src={qrImg} alt={`QR ${qrTarget?.identifier}`} className="h-52 w-52" />
          ) : (
            <div className="flex h-52 w-52 items-center justify-center"><Spinner /></div>
          )}
          <div>
            <p className="text-lg font-extrabold text-stone-900">{qrTarget?.name}</p>
            <p className="font-mono text-sm text-stone-600">NIS/NIP: {qrTarget?.identifier}</p>
            <p className="mt-0.5 text-xs text-stone-400">
              QR berisi kode anggota — discan di halaman Sirkulasi saat peminjaman.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setQrTarget(null)}>Tutup</Button>
          <Button loading={printingQr} onClick={printMemberQr}>
            <Printer size={16} /> Cetak Kartu
          </Button>
        </div>
      </Modal>

      {/* Reset password */}
      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password — ${resetTarget?.name ?? ''}`}>
        <form onSubmit={resetPassword} className="space-y-4">
          <Field label="Password Baru" required hint="Minimal 6 karakter. Berikan password baru kepada anggota.">
            <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>Batal</Button>
            <Button type="submit" loading={resetting}>Reset Password</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
