import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import cn from '../../utils/cn';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[min(96rem,96vw)]',
};

/**
 * Accessible modal: portalled, focus-trapped-ish, ESC to close,
 * body scroll lock and optional full-screen mode for the hall plan.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  fullScreen = false,
  bodyClassName,
  hideClose = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Dialog'}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={cn(
              'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-soft-lg dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl',
              fullScreen ? 'sm:h-[92vh] sm:max-w-[96vw]' : SIZES[size]
            )}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
                <div className="flex min-w-0 items-start gap-3">
                  {Icon ? (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                      <Icon className="h-5 w-5" />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-ink dark:text-white">{title}</h2>
                    {description ? (
                      <p className="mt-0.5 text-sm text-muted">{description}</p>
                    ) : null}
                  </div>
                </div>
                {!hideClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="-mr-1 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                ) : null}
              </div>
            )}

            <div className={cn('flex-1 overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>

            {footer ? (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40 sm:px-6">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export { Modal };
