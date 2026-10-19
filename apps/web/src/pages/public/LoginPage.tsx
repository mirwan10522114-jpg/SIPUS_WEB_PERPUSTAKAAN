import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, IdCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { errMessage } from '../../api/client';
import { Button, Card, Field, Input } from '../../components/ui/ui';
import { useToast } from '../../components/ui/Toast';

const DEMO_ACCOUNTS = [
  { label: 'Pustakawan', identifier: 'ADM001', password: 'admin123' },
  { label: 'Siswa', identifier: '2026001', password: 'siswa123' },
  { label: 'Guru', identifier: 'G001', password: 'guru123' },
  { label: 'Super Admin', identifier: 'SA001', password: 'superadmin123' },
];

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const toast = useToast();

  const redirectFor = (role: string) =>
    role === 'admin' || role === 'super_admin' ? '/admin' : '/dashboard';

  if (user) {
    navigate(redirectFor(user.role), { replace: true });
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(identifier.trim(), password);
      toast('success', `Selamat datang, ${u.name}!`);
      navigate(location.state?.from ?? redirectFor(u.role), { replace: true });
    } catch (err) {
      toast('error', errMessage(err, 'Login gagal'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-12 sm:py-16">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-white">
            <BookOpen size={26} />
          </span>
          <h1 className="text-2xl font-extrabold text-stone-900">Masuk ke SIPUS</h1>
          <p className="mt-1 text-sm text-stone-500">Gunakan NIS (siswa) atau NIP (guru/staf) Anda.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="NIS / NIP" required>
            <div className="relative">
              <IdCard size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Contoh: 2026001"
                className="pl-10"
                required
                autoFocus
              />
            </div>
          </Field>
          <Field label="Password" required>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            Masuk
          </Button>
        </form>

        <div className="mt-6 rounded-xl bg-stone-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Akun Demo</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.identifier}
                type="button"
                onClick={() => {
                  setIdentifier(acc.identifier);
                  setPassword(acc.password);
                }}
                className="rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-left text-xs font-semibold text-stone-700 transition hover:border-brand-400 hover:text-brand-700"
              >
                {acc.label}
                <span className="block font-mono text-[10px] font-normal text-stone-400">{acc.identifier}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
