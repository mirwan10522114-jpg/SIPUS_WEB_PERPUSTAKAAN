import { useEffect, useState } from 'react';
import { Save, Plus, ShieldCheck, ShieldOff } from 'lucide-react';
import { api, errMessage } from '../../api/client';
import { Badge, Button, Card, Field, Input, Modal, Spinner } from '../../components/ui/ui';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';

interface SettingRow {
  key: string;
  label: string;
  hint: string;
  suffix?: string;
}

const SETTING_ROWS: SettingRow[] = [
  { key: 'fine_per_day', label: 'Denda per Hari', hint: 'Denda keterlambatan per hari per buku (FR-24)', suffix: 'Rp' },
  { key: 'loan_days', label: 'Durasi Peminjaman', hint: 'Jatuh tempo otomatis dari tanggal pinjam (FR-17)', suffix: 'hari' },
  { key: 'max_loans_siswa', label: 'Kuota Pinjam Siswa', hint: 'Maksimal buku yang boleh dipinjam siswa (FR-14)', suffix: 'buku' },
  { key: 'max_loans_guru', label: 'Kuota Pinjam Guru', hint: 'Maksimal buku yang boleh dipinjam guru (FR-14)', suffix: 'buku' },
  { key: 'reservation_hold_days', label: 'Batas Ambil Reservasi', hint: 'Reservasi kedaluwarsa jika tidak diambil (FR-23)', suffix: 'hari' },
];

interface AdminAccount {
  id: number;
  identifier: string;
  name: string;
  email: string | null;
  role: 'admin' | 'super_admin';
  isActive: boolean;
}

export function SettingsPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const isSuper = me?.role === 'super_admin';

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [libraryName, setLibraryName] = useState('');
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ identifier: '', name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/settings'),
      isSuper ? api.get('/accounts') : Promise.resolve(null),
    ])
      .then(([s, a]: any) => {
        setSettings(s.data.data);
        setLibraryName(s.data.data.library_name ?? '');
        if (a) setAdmins(a.data.data);
      })
      .catch((e) => toast('error', errMessage(e)))
      .finally(() => setLoading(false));
  }, [isSuper]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Array<{ key: string; value: string }> = SETTING_ROWS.map((r) => ({
        key: r.key,
        value: String(settings[r.key] ?? ''),
      }));
      payload.push({ key: 'library_name', value: libraryName });
      await api.put('/settings', { settings: payload });
      toast('success', 'Pengaturan berhasil disimpan');
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/accounts', { ...newAdmin, email: newAdmin.email || undefined });
      toast('success', 'Akun pustakawan berhasil dibuat');
      setCreateOpen(false);
      setNewAdmin({ identifier: '', name: '', email: '', password: '' });
      const res = await api.get('/accounts');
      setAdmins(res.data.data);
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const toggleAdmin = async (admin: AdminAccount) => {
    try {
      await api.put(`/accounts/${admin.id}/toggle`);
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, isActive: !a.isActive } : a)));
      toast('success', 'Status akun diperbarui');
    } catch (e) {
      toast('error', errMessage(e));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-stone-900">Pengaturan Sistem</h1>
        <p className="mt-1 text-sm text-stone-500">
          Konfigurasi aturan perpustakaan{isSuper ? ' & kelola akun pustakawan' : ''}.
        </p>
      </header>

      <Card className="p-5">
        <form onSubmit={save} className="space-y-4">
          <Field label="Nama Perpustakaan" hint="Ditampilkan di halaman beranda publik">
            <Input value={libraryName} onChange={(e) => setLibraryName(e.target.value)} disabled={!isSuper} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {SETTING_ROWS.map((row) => (
              <Field key={row.key} label={row.label} hint={row.hint}>
                <div className="relative">
                  {row.suffix === 'Rp' && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-400">Rp</span>
                  )}
                  <Input
                    type="number"
                    min={1}
                    value={settings[row.key] ?? ''}
                    onChange={(e) => setSettings({ ...settings, [row.key]: e.target.value })}
                    disabled={!isSuper}
                    className={row.suffix === 'Rp' ? 'pl-9' : ''}
                  />
                  {row.suffix && row.suffix !== 'Rp' && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">{row.suffix}</span>
                  )}
                </div>
              </Field>
            ))}
          </div>
          {isSuper ? (
            <div className="flex justify-end border-t border-stone-100 pt-4">
              <Button type="submit" loading={saving}>
                <Save size={16} /> Simpan Pengaturan
              </Button>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              Pengaturan hanya dapat diubah oleh Super Admin.
            </p>
          )}
        </form>
      </Card>

      {isSuper && (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-stone-900">Akun Pustakawan</h2>
              <p className="text-sm text-stone-500">Super Admin dapat mengelola akun admin (PRD §6).</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Buat Akun Admin
            </Button>
          </div>
          <ul className="divide-y divide-stone-100">
            {admins.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3.5">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.role === 'super_admin' ? 'bg-brand-100 text-brand-700' : 'bg-stone-100 text-stone-600'}`}>
                  <ShieldCheck size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-stone-900">
                    {a.name}
                    {a.id === me?.id && <span className="ml-1.5 text-xs font-medium text-stone-400">(Anda)</span>}
                  </p>
                  <p className="font-mono text-xs text-stone-500">{a.identifier} · {a.role === 'super_admin' ? 'Super Admin' : 'Pustakawan'}</p>
                </div>
                <Badge
                  label={a.isActive ? 'Aktif' : 'Nonaktif'}
                  cls={a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'}
                />
                {a.role !== 'super_admin' && (
                  <Button variant="outline" className="px-3 py-2 text-xs" onClick={() => toggleAdmin(a)}>
                    <ShieldOff size={13} /> {a.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat Akun Pustakawan">
        <form onSubmit={createAdmin} className="space-y-4">
          <Field label="NIP" required>
            <Input value={newAdmin.identifier} onChange={(e) => setNewAdmin({ ...newAdmin, identifier: e.target.value })} required />
          </Field>
          <Field label="Nama Lengkap" required>
            <Input value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} />
          </Field>
          <Field label="Password" required hint="Minimal 6 karakter">
            <Input type="password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} required minLength={6} />
          </Field>
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button type="submit" loading={creating}>Buat Akun</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
