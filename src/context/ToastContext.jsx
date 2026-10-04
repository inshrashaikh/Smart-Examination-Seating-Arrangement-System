import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    ring: 'ring-emerald-500/30',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    ring: 'ring-rose-500/30',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-300',
    bar: 'bg-rose-500',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'ring-amber-500/30',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
  info: {
    icon: Info,
    ring: 'ring-primary/30',
    bg: 'bg-primary-50 dark:bg-primary-500/10',
    text: 'text-primary-700 dark:text-primary-300',
    bar: 'bg-primary',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, { type = 'info', title, duration = 4200, action } = {}) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev.slice(-4), { id, message, type, title, action }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (message, options) => push(message, { ...options, type: 'success' }),
      error: (message, options) => push(message, { ...options, type: 'error' }),
      warning: (message, options) => push(message, { ...options, type: 'warning' }),
      info: (message, options) => push(message, { ...options, type: 'info' }),
      dismiss,
      toasts,
    }),
    [push, dismiss, toasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:items-end sm:justify-start sm:p-6">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const variant = VARIANTS[t.type] ?? VARIANTS.info;
            const Icon = variant.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.94, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-soft-lg backdrop-blur-xl ring-4 dark:border-slate-700/80 dark:bg-slate-900/95 ${variant.ring}`}
                role="status"
              >
                <div className="flex items-start gap-3 p-4">
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${variant.bg} ${variant.text}`}>
                    <Icon className="h-4.5 w-4.5" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    {t.title ? (
                      <p className="text-sm font-semibold text-ink dark:text-white">{t.title}</p>
                    ) : null}
                    <p className="text-sm text-slate-600 dark:text-slate-300">{t.message}</p>
                    {t.action ? (
                      <button
                        type="button"
                        onClick={() => {
                          t.action.onClick?.();
                          dismiss(t.id);
                        }}
                        className="mt-2 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-300"
                      >
                        {t.action.label}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss notification"
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X size={16} />
                  </button>
                </div>
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: (t.duration ?? 4200) / 1000, ease: 'linear' }}
                  style={{ originX: 0 }}
                  className={`h-1 w-full ${variant.bar}`}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export default ToastContext;
export { ToastContext };
