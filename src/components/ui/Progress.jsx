import { motion } from 'framer-motion';
import cn from '../../utils/cn';

const TONES = {
  primary: 'from-primary-500 to-primary-600',
  accent: 'from-accent-500 to-accent-600',
  emerald: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-amber-600',
  rose: 'from-rose-500 to-rose-600',
  sky: 'from-sky-500 to-sky-600',
};

export function ProgressBar({
  value = 0,
  max = 100,
  tone = 'primary',
  size = 'md',
  showLabel = false,
  label,
  animated = true,
  className,
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const height = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div className={cn('w-full', className)}>
      {showLabel || label ? (
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
          <span className="text-muted">{label}</span>
          <span className="text-ink dark:text-slate-200">{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div className={cn('w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/60', height)}>
        <motion.div
          initial={{ width: animated ? 0 : `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className={cn('h-full rounded-full bg-gradient-to-r', TONES[tone] ?? TONES.primary)}
        />
      </div>
    </div>
  );
}

/** Circular progress ring with the value in the middle. */
export function ProgressRing({
  value = 0,
  size = 120,
  thickness = 10,
  tone = 'primary',
  label,
  sublabel,
  children,
  className,
}) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const colors = {
    primary: '#4F46E5',
    accent: '#14B8A6',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    sky: '#0EA5E9',
  };
  const color = colors[tone] ?? colors.primary;

  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-slate-200/80 dark:stroke-slate-700/70"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (pct / 100) * circumference }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children ?? (
          <div>
            <p className="font-display text-2xl font-extrabold text-ink dark:text-white">{Math.round(pct)}%</p>
            {label ? <p className="text-xs font-medium text-muted">{label}</p> : null}
            {sublabel ? <p className="text-[10px] text-slate-400">{sublabel}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgressBar;