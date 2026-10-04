import { getDepartment } from '../../data/departments';
import { initials } from '../../utils/format';
import cn from '../../utils/cn';

const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:ring-slate-600',
  primary: 'bg-primary-50 text-primary-700 ring-primary-100 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-500/30',
  accent: 'bg-accent-50 text-accent-700 ring-accent-100 dark:bg-accent-500/15 dark:text-accent-300 dark:ring-accent-500/30',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  warning: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  danger: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
  info: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30',
};

export function Badge({ tone = 'slate', size = 'md', dot = false, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        TONES[tone] ?? TONES.slate,
        className
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/** Department chip using the shared department palette. */
export function DeptBadge({ code, size = 'md', showSoft = true, className }) {
  const dept = getDepartment(code);
  if (!showSoft) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 font-semibold', className)} style={{ color: dept.color }}>
        <span className="h-2 w-2 rounded-full" style={{ background: dept.color }} />
        {dept.short}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset whitespace-nowrap dark:bg-opacity-10',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        className
      )}
      style={{ background: dept.soft, color: dept.text, borderColor: `${dept.color}33` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dept.color }} />
      {dept.short}
    </span>
  );
}

const STATUS_TONES = {
  SCHEDULED: 'info',
  PUBLISHED: 'success',
  COMPLETED: 'slate',
  GENERATED: 'violet',
  DRAFT: 'warning',
  CANCELLED: 'danger',
  ACTIVE: 'success',
  INACTIVE: 'slate',
  ASSIGNED: 'info',
  CONFIRMED: 'success',
  PROVISIONAL: 'warning',
  PRESENT: 'success',
  ABSENT: 'danger',
  INVIGILATOR: 'primary',
  CHIEF_INVIGILATOR: 'violet',
  EXTERNAL_SUPERVISOR: 'warning',
};

export function StatusBadge({ status, size = 'md' }) {
  const tone = STATUS_TONES[status] ?? 'slate';
  return (
    <Badge tone={tone} size={size} dot>
      {String(status ?? '—').replace(/_/g, ' ')}
    </Badge>
  );
}

/** Circular avatar with photo, initials fallback and department colours. */
export function Avatar({ name, photo, size = 40, department, className, ring = true }) {
  const dept = department ? getDepartment(department) : null;
  const dimension = `${size}px`;
  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold',
        ring && 'ring-2 ring-white dark:ring-slate-900',
        className
      )}
      style={{
        width: dimension,
        height: dimension,
        background: dept ? `linear-gradient(135deg, ${dept.color}, ${dept.color}bb)` : 'linear-gradient(135deg,#4F46E5,#14B8A6)',
        color: '#fff',
        fontSize: Math.max(10, size * 0.38),
      }}
      title={name}
    >
      {photo ? (
        <img src={photo} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export default Badge;