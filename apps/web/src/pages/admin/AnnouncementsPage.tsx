import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import { api, errMessage } from '../../api/client';
import type { Announcement } from '../../api/types';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner, Textarea } from '../../components/ui/ui';
import { useToast } from '../../components/ui/Toast';
import { tanggalJam } from '../../utils/format';

const EMPTY = { title: '', content: '', isActive: true };

export function AnnouncementsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/announcements/admin/all')
      .then((res) => setItems(res.data.data))
      .catch((e) => toast('error', errMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/announcements/${editing.id}`, form);
      else await api.post('/announcements', form);
      toast('success', editing ? 'Pengumuman diperbarui' : 'Pengumuman dibuat (tampil di beranda — FR-32)');
      setFormOpen(false);
      load();
    } catch (e) {
      toast('error', errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Announcement) => {
    if (!confirm(`Hapus pengumuman "${item.title}"?`)) return;
    try {
      await api.delete(`/announcements/${item.id}`);
      toast('success', 'Pengumuman dihapus');
      load();
    } catch (e) {
      toast('error', errMessage(e));
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Pengumuman</h1>
          <p className="mt-1 text-sm text-stone-500">Kelola berita & pengumuman perpustakaan (FR-31).</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY }); setFormOpen(true); }}>
          <Plus size={16} /> Buat Pengumuman
        </Button>
      </header>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada pengumuman" description="Buat pengumuman pertama untuk ditampilkan di beranda." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col p-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                  <Megaphone size={14} /> {tanggalJam(item.publishedAt)}
                </span>
                <Badge
                  label={item.isActive ? 'Tayang' : 'Draft'}
                  cls={item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'}
                />
              </div>
              <h3 className="font-bold text-stone-900">{item.title}</h3>
              <p className="mt-1.5 flex-1 whitespace-pre-line text-sm leading-relaxed text-stone-600 line-clamp-4">
                {item.content}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
                <span className="text-xs text-stone-400">oleh {item.publisher?.name ?? '—'}</span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    className="px-3 py-2 text-xs"
                    onClick={() => {
                      setEditing(item);
                      setForm({ title: item.title, content: item.content, isActive: item.isActive });
                      setFormOpen(true);
                    }}
                  >
                    <Pencil size={13} /> Edit
                  </Button>
                  <Button variant="danger" className="px-3 py-2 text-xs" onClick={() => remove(item)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Pengumuman' : 'Buat Pengumuman'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Judul" required>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Isi Pengumuman" required>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
              className="min-h-40"
            />
          </Field>
          <label className="flex min-h-11 items-center gap-2.5 rounded-xl bg-stone-50 px-3.5 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-stone-300"
            />
            Tayangkan di halaman beranda publik
          </label>
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}>{editing ? 'Simpan' : 'Terbitkan'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
