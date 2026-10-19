import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<{ toast: (kind: ToastKind, message: string) => void } | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 space-y-2 sm:left-auto sm:right-4 sm:translate-x-0">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              t.kind === 'success'
                ? 'bg-emerald-600 text-white'
                : t.kind === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-stone-800 text-white'
            }`}
          >
            {t.kind === 'success' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : t.kind === 'error' ? (
              <XCircle size={18} className="mt-0.5 shrink-0" />
            ) : (
              <Info size={18} className="mt-0.5 shrink-0" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider');
  return ctx.toast;
}
