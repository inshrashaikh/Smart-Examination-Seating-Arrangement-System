import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import cn from '../../utils/cn';

/**
 * Lightweight hover/focus tooltip (no external dependency).
 * Wrap any trigger: <Tooltip content="…"><button/></Tooltip>
 */
export default function Tooltip({ content, children, side = 'top', className, delay = 120, disabled }) {
  const [open, setOpen] = useState(false);
  if (!content || disabled) return children;

  const positions = {
    top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
    bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
    left: 'right-full top-1/2 mr-2 -translate-y-1/2',
    right: 'left-full top-1/2 ml-2 -translate-y-1/2',
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.94, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            role="tooltip"
            className={cn(
              'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg dark:bg-slate-700',
              positions[side],
              className
            )}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

/** Richer variant used by the hall plan seats (multi-line, left aligned). */
export function RichTooltip({ content, children, side = 'right', visible, className }) {
  const positions = {
    top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
    bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
    left: 'right-full top-1/2 mr-3 -translate-y-1/2',
    right: 'left-full top-1/2 ml-3 -translate-y-1/2',
  };

  return (
    <span className="relative inline-flex">
      {children}
      <AnimatePresence>
        {visible ? (
          <motion.span
            initial={{ opacity: 0, x: side === 'right' ? -6 : 6, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className={cn(
              'pointer-events-none absolute z-50 w-56 rounded-xl border border-slate-700/60 bg-slate-900 p-3 text-left shadow-soft-lg',
              positions[side],
              className
            )}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

export { Tooltip };
