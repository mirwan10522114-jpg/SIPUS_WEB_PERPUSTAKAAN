import { ReactNode, useEffect, useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { BookOpen, Bell, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ROLE_LABEL, tanggalJam } from '../utils/format';
import { Spinner } from './ui/ui';
import type { Notification } from '../api/types';

/** Layout dashboard siswa/guru — top-nav sederhana + lonceng notifikasi (FR-22). */
export function MemberLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'siswa' && user.role !== 'guru'))) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  const loadNotifs = () => {
    api.get('/notifications/me').then((res) => {
      setNotifs(res.data.data);
      setUnread(res.data.meta.unreadCount);
    }).catch(() => {});
  };

  useEffect(() => {
    if (user) loadNotifs();
  }, [user]);

  if (loading || !user) return <Spinner full />;

  const markAllRead = async () => {
    await api.put('/notifications/read-all').catch(() => {});
    loadNotifs();
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
              <BookOpen size={20} />
            </span>
            <span className="hidden font-extrabold text-stone-900 sm:block">SIPUS</span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Lonceng notifikasi */}
            <div className="relative">
              <button
                className="relative flex h-11 w-11 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100"
                onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); }}
                aria-label="Notifikasi"
              >
                <Bell size={20} />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="fixed inset-x-4 top-20 z-50 max-h-96 overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
                  <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                    <p className="font-bold text-stone-800">Notifikasi</p>
                    {unread > 0 && (
                      <button className="text-xs font-semibold text-brand-700 hover:underline" onClick={markAllRead}>
                        Tandai semua terbaca
                      </button>
                    )}
                  </div>
                  {notifs.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-stone-500">Belum ada notifikasi</p>
                  ) : (
                    notifs.map((n) => (
                      <div
                        key={n.id}
                        className={`border-b border-stone-50 px-4 py-3 ${!n.isRead ? 'bg-brand-50/60' : ''}`}
                      >
                        <p className="text-sm font-bold text-stone-800">{n.title}</p>
                        <p className="mt-0.5 text-sm text-stone-600">{n.message}</p>
                        <p className="mt-1 text-xs text-stone-400">{tanggalJam(n.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Profil / menu */}
            <div className="relative">
              <button
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 hover:bg-stone-100"
                onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                  {user.name.charAt(0)}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-36 truncate text-sm font-bold text-stone-800">{user.name}</span>
                  <span className="block text-xs text-stone-500">{ROLE_LABEL[user.role]}</span>
                </span>
                {menuOpen ? <X size={16} className="text-stone-500" /> : <Menu size={16} className="text-stone-500" />}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
                  <div className="px-3 py-2">
                    <p className="text-sm font-bold text-stone-800">{user.name}</p>
                    <p className="text-xs text-stone-500">NIS/NIP: {user.identifier}</p>
                    {user.classOrPosition && <p className="text-xs text-stone-500">{user.classOrPosition}</p>}
                  </div>
                  <Link to="/" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100">
                    Katalog Buku
                  </Link>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
