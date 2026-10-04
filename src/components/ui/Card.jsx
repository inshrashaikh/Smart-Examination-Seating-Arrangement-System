import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import cn from '../../utils/cn';

const Card = forwardRef(function Card(
  { as: Component = 'div', hover = false, padded = true, glass = false, className, children, ...props },
  ref
) {
  return (
    <Component
      ref={ref}
      className={cn(
        'relative rounded-2xl border',
        glass
          ? 'glass'
          : 'border-slate-200/80 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900/60',
        padded && 'p-5 sm:p-6',
        hover && 'card-surface-hover',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

function CardHeader({ className, children, action, ...props }) {
  return (
    <div
      className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800/80', className)}
      {...props}
    >
      <div className="min-w-0">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function CardTitle({ className, children, title, icon: Icon, subtitle, ...props }) {
  return (
    <div className="flex items-start gap-3" {...props}>
      {Icon ? (
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      ) : null}
      <div className="min-w-0">
        <h3 className="truncate text-base font-bold text-ink dark:text-white">{title ?? children}</h3>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function CardBody({ className, children, ...props }) {
  return (
    <div className={cn('mt-4', className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800/80', className)} {...props}>
      {children}
    </div>
  );
}

/** Animated wrapper used to stagger dashboard cards. */
function Stagger({ children, className, delay = 0, y = 16 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default Card;
export { Card, CardHeader, CardTitle, CardBody, CardFooter, Stagger };