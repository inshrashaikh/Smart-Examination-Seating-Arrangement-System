import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import cn from '../../utils/cn';

/** Friendly placeholder for zero-data lists and tables. */
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-6 py-10' : 'px-6 py-16',
        className
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 -z-10 animate-pulse-ring rounded-3xl bg-primary-400/25" />
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-primary-50 to-accent-50 text-primary-600 dark:from-primary-500/15 dark:to-accent-500/15 dark:text-primary-300">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      </div>
      <h3 className="mt-5 text-base font-bold text-ink dark:text-white">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      ) : null}
      {action || secondaryAction ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </motion.div>
  );
}

export { EmptyState };
