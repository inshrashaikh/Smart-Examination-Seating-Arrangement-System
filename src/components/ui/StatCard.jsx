import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import Card from './Card';
import useCountUp from '../../hooks/useCountUp';
import cn from '../../utils/cn';

const TONES = {
  primary: {
    chip: 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300',
    stroke: '#4F46E5',
    glow: 'from-primary-500/20',
  },
  accent: {
    chip: 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300',
    stroke: '#14B8A6',
    glow: 'from-accent-500/20',
  },
  amber: {
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    stroke: '#F59E0B',
    glow: 'from-amber-500/20',
  },
  sky: {
    chip: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    stroke: '#0EA5E9',
    glow: 'from-sky-500/20',
  },
  rose: {
    chip: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    stroke: '#F43F5E',
    glow: 'from-rose-500/20',
  },
  violet: {
    chip: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    stroke: '#8B5CF6',
    glow: 'from-violet-500/20',
  },
};

/**
 * Animated KPI card with a counter, trend chip and optional sparkline bar strip.
 */
export default function StatCard({
  label,
  value,
  suffix = '',
  prefix = '',
  icon: Icon,
  tone = 'primary',
  trend,
  trendLabel,
  decimals = 0,
  hint,
  onClick,
  bars = [],
  index = 0,
}) {
  const { ref, value: display } = useCountUp(value, { decimals });
  const toneStyle = TONES[tone] ?? TONES.primary;
  const TrendIcon = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;

  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      ref={ref}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={onClick ? { y: -4 } : { y: -2 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-soft transition-shadow dark:border-slate-800 dark:bg-slate-900/60',
        onClick && 'hover:border-primary/30 hover:shadow-soft-lg'
      )}
    >
      {/* soft gradient wash */}
      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100',
          toneStyle.glow
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-muted">{label}</p>
          <p className="mt-2 flex items-baseline gap-1 font-display text-[28px] font-extrabold leading-none tracking-tight text-ink dark:text-white">
            {prefix}
            <span>{display}</span>
            {suffix ? <span className="text-lg font-bold text-muted">{suffix}</span> : null}
          </p>
        </div>
        {Icon ? (
          <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', toneStyle.chip)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      {(trend !== undefined || hint) && (
        <div className="relative mt-3 flex items-center gap-2">
          {trend !== undefined ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-bold',
                trend > 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : trend < 0
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300'
              )}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              {trend > 0 ? '+' : ''}
              {trend}%
            </span>
          ) : null}
          {trendLabel || hint ? (
            <span className="truncate text-xs text-muted">{trendLabel || hint}</span>
          ) : null}
        </div>
      )}

      {bars.length ? (
        <div className="relative mt-4 flex h-10 items-end gap-1">
          {bars.map((bar, i) => {
            const height = Math.max(8, (bar / Math.max(...bars)) * 100);
            return (
              <motion.span
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.6, delay: 0.25 + i * 0.05, ease: 'easeOut' }}
                className="flex-1 rounded-t-[3px] opacity-70"
                style={{ background: toneStyle.stroke }}
              />
            );
          })}
        </div>
      ) : null}
    </Wrapper>
  );
}

export { TONES as STAT_TONES };

export { StatCard };
