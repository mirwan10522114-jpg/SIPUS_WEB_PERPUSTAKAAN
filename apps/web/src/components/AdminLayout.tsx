import { ReactNode, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookOpen, LayoutDashboard, BookMarked, Users, RefreshCw, HandCoins,
  BarChart3, Megaphone, Settings, LogOut, Menu, X, Bell, Book,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL } from '../utils/format';
import { Spinner } from './ui/ui';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/buku', label: 'Manajemen Buku', icon: BookMarked },
  { to: '/admin/anggota', label: 'Manajemen Anggota', icon: Users },
  { to: '/admin/sirkulasi', label: 'Sirkulasi', icon: RefreshCw },
  { to: '/admin/denda', label: 'Denda', icon: HandCoins },
  { to: '/admin/laporan', label: 'Laporan', icon: BarChart3 },
  { to: '/admin/pengumuman', label: 'Pengumuman', icon: Megaphone },
];

const SUPER_NAV: NavItem = { to: '/admin/pengaturan', label: 'Pengaturan', icon: Settings };

/** Layout dashboard admin — sidebar tetap di desktop, collapse di mobile (PRD §9.1). */
export function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'admin' && user.role !== 'super_admin'))) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (loading || !user) return <Spinner full />;

  const items = user.role === 'super_admin' ? [...NAV_ITEMS, SUPER_NAV] : NAV_ITEMS;

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-4 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
          <BookOpen size={20} />
        </span>
        <div>
          <p className="font-extrabold text-stone-900">SIPUS</p>
          <p className="text-[11px] font-medium text-stone-500">Panel Pustakawan</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                isActive ? 'bg-brand-700 text-white shadow' : 'text-stone-600 hover:bg-brand-50 hover:text-brand-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-stone-100 p-3">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-bold text-stone-800">{user.name}</p>
          <p className="text-xs text-stone-500">{ROLE_LABEL[user.role]} · {user.identifier}</p>
        </div>
        <button
          onClick={logout}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} /> Keluar
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-stone-200 bg-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile (overlay) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-stone-900/50" />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-stone-200 bg-white/90 px-4 backdrop-blur">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Buka menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <p className="hidden text-sm font-semibold text-stone-500 lg:block">
            Sistem Informasi Perpustakaan — Panel Admin
          </p>
          <div className="ml-auto flex items-center gap-2">
            <NavLink
              to="/"
              className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100"
              title="Lihat situs publik"
            >
              <Book size={18} />
              <span className="hidden sm:inline">Situs Publik</span>
            </NavLink>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
