import cn from '../../utils/cn';

export function Skeleton({ className, ...props }) {
  return <div className={cn('skeleton', className)} {...props} />;
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3, className }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/60', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2.5 w-3/4" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-2.5" style={{ width: `${95 - i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900/60">
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <Skeleton className="h-9 w-64 rounded-xl" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-4">
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ className }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/60', className)}>
      <Skeleton className="h-4 w-40" />
      <div className="mt-6 flex h-52 items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${30 + ((i * 37) % 60)}%` }} />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;