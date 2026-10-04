import { useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import cn from '../../utils/cn';

/**
 * Animated tab bar. `variant="pills"` for soft floating tabs,
 * `variant="underline"` for dashboard sub-navigation.
 */
export default function Tabs({ tabs, value, onChange, variant = 'pills', className, size = 'md' }) {
  const groupId = useId();
  const layoutId = `tab-${groupId}`;
  const [hovered, setHovered] = useState(null);
  const heightClass = size === 'sm' ? 'h-9 text-[13px]' : 'h-11 text-sm';

  return (
    <div
      role="tablist"
      className={cn(
        'relative flex flex-wrap items-center gap-1',
        variant === 'pills' &&
          'w-fit rounded-2xl border border-slate-200/80 bg-white p-1 shadow-soft dark:border-slate-700/70 dark:bg-slate-900/70',
        variant === 'underline' && 'w-full gap-0 border-b border-slate-200 dark:border-slate-800',
        variant === 'segmented' &&
          'w-full rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/70',
        className
      )}
      onMouseLeave={() => setHovered(null)}
    >
      {tabs.map((tab) => {
        const isActive = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(tab.value)}
            onMouseEnter={() => setHovered(tab.value)}
            onFocus={() => setHovered(tab.value)}
            className={cn(
              'relative z-10 inline-flex items-center gap-2 rounded-xl font-semibold transition-colors',
              heightClass,
              variant === 'underline' ? 'px-4' : 'px-4',
              variant === 'pills' && 'px-4',
              variant === 'underline'
                ? cn(
                    '-mb-px border-b-2',
                    isActive
                      ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-300'
                      : 'border-transparent text-muted hover:text-ink dark:hover:text-white'
                  )
                : cn(
                    variant === 'segmented' ? 'flex-1 justify-center' : '',
                    isActive
                      ? variant === 'pills'
                        ? 'text-white'
                        : 'text-ink dark:text-white'
                      : 'text-muted hover:text-ink dark:hover:text-white'
                  )
                )}
          >
            {isActive ? (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className={cn(
                  'absolute inset-0 -z-10 rounded-xl',
                  variant === 'pills' && 'bg-primary-600 shadow-glow',
                  variant === 'segmented' && 'bg-white shadow-soft dark:bg-slate-900'
                )}
              />
            ) : null}
            {isActive && variant !== 'pills' ? (
              <motion.span
                layoutId={`${layoutId}-soft`}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className={cn(
                  'absolute inset-0 -z-10 rounded-xl',
                  variant === 'pills' && 'bg-primary-600',
                  variant === 'segmented' ? 'bg-white shadow-soft dark:bg-slate-900' : 'bg-primary-50 dark:bg-primary-500/15'
                )}
              />
            ) : null}
            {tab.icon ? <tab.icon className="h-4 w-4" /> : null}
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={cn(
                  'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isActive && variant === 'pills'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Pill-shaped filter row with a search input (used in Students / Halls pages). */
export function FilterBar({ value, onChange, options, placeholder = 'Filter…', className, trailing }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition',
                isActive
                  ? 'border-primary-600 bg-primary-600 text-white shadow-glow'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300'
              )}
            >
              {option.dot ? (
                <span className="h-2 w-2 rounded-full" style={{ background: option.dot }} />
              ) : null}
              {option.label}
              {option.count !== undefined ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] font-bold',
                    isActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'
                  )}
                >
                  {option.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-9 w-full rounded-full border border-slate-200 bg-white pl-9 pr-9 text-[13px] text-ink placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 sm:w-56"
          />
          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Clear filter"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        {trailing}
      </div>
    </div>
  );
}

export { AnimatePresence };

export { Tabs };
