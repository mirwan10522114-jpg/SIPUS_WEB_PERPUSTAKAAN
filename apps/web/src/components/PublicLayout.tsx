import { ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, Menu, X, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL } from '../utils/format';
import { Button } from './ui/ui';

/** Layout halaman publik — navbar mobile hamburger (PRD §9.1). */
export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `min-h-11 flex items-center px-3 py-2 rounded-xl text-sm font-semibold transition ${
      isActive ? 'bg-brand-100 text-brand-800' : 'text-stone-600 hover:bg-stone-100'
    }`;

  const dashboardTarget =
    user?.role === 'admin' || user?.role === 'super_admin' ? '/admin' : '/dashboard';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
              <BookOpen size={20} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-stone-900">
              SIPUS
              <span className="hidden text-xs font-medium text-stone-500 sm:block">Perpustakaan Digital</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={navLink}>
              Beranda
            </NavLink>
            <NavLink to="/katalog" className={navLink}>
              Katalog
            </NavLink>
            {user ? (
              <>
                {user.role === 'siswa' || user.role === 'guru' ? (
                  <NavLink to="/dashboard" className={navLink}>
                    Dashboard
                  </NavLink>
                ) : (
                  <NavLink to="/admin" className={navLink}>
                    Admin
                  </NavLink>
                )}
                <Button variant="outline" className="ml-2" onClick={() => navigate(dashboardTarget)}>
                  <LayoutDashboard size={16} />
                  {user.name.split(' ')[0]}
                </Button>
              </>
            ) : (
              <Button className="ml-2" onClick={() => navigate('/login')}>
                Masuk
              </Button>
            )}
          </nav>

          {/* Hamburger (mobile) */}
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Buka menu"
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav className="space-y-1 border-t border-stone-200 bg-white px-4 py-3 md:hidden">
            <NavLink to="/" end className={navLink} onClick={() => setOpen(false)}>
              Beranda
            </NavLink>
            <NavLink to="/katalog" className={navLink} onClick={() => setOpen(false)}>
              Katalog
            </NavLink>
            {user ? (
              <>
                <NavLink to={dashboardTarget} className={navLink} onClick={() => setOpen(false)}>
                  {user.role === 'siswa' || user.role === 'guru' ? 'Dashboard Saya' : 'Dashboard Admin'}
                </NavLink>
                <div className="px-3 py-2 text-xs text-stone-500">
                  Masuk sebagai <b>{user.name}</b> · {ROLE_LABEL[user.role]}
                </div>
              </>
            ) : (
              <Button className="mt-2 w-full" onClick={() => { setOpen(false); navigate('/login'); }}>
                Masuk
              </Button>
            )}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-stone-500">
          <p className="font-semibold text-stone-700">SIPUS — Sistem Informasi Perpustakaan Sekolah</p>
          <p className="mt-1">© {new Date().getFullYear()} Perpustakaan SMA. Semua hak dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
