import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { PublicLayout } from './components/PublicLayout';
import { AdminLayout } from './components/AdminLayout';
import { MemberLayout } from './components/MemberLayout';
import { HomePage } from './pages/public/HomePage';
import { CatalogPage } from './pages/public/CatalogPage';
import { BookDetailPage } from './pages/public/BookDetailPage';
import { LoginPage } from './pages/public/LoginPage';
import { TestQrPage } from './pages/public/TestQrPage';
import { MemberDashboardPage } from './pages/member/MemberDashboardPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { BooksPage } from './pages/admin/BooksPage';
import { MembersPage } from './pages/admin/MembersPage';
import { CirculationPage } from './pages/admin/CirculationPage';
import { FinesPage } from './pages/admin/FinesPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { AnnouncementsPage } from './pages/admin/AnnouncementsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { EmptyState } from './components/ui/ui';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="katalog" element={<CatalogPage />} />
              <Route path="katalog/:id" element={<BookDetailPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="test-qr" element={<TestQrPage />} />
            </Route>

            <Route path="dashboard" element={<MemberLayout />}>
              <Route index element={<MemberDashboardPage />} />
            </Route>

            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="buku" element={<BooksPage />} />
              <Route path="anggota" element={<MembersPage />} />
              <Route path="sirkulasi" element={<CirculationPage />} />
              <Route path="denda" element={<FinesPage />} />
              <Route path="laporan" element={<ReportsPage />} />
              <Route path="pengumuman" element={<AnnouncementsPage />} />
              <Route path="pengaturan" element={<SettingsPage />} />
            </Route>

            <Route
              path="*"
              element={
                <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
                  <EmptyState title="Halaman tidak ditemukan" description="Alamat yang Anda tuju tidak tersedia." />
                  <Navigate to="/" replace />
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
