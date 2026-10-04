import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import cn from '../../utils/cn';

/** Standard page title block used by every dashboard screen. */
export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  actions,
  breadcrumb,
  className,
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn('mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between', className)}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon ? (
          <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-glow sm:grid">
            <Icon className="h-6 w-6" />
          </span>
        ) : null}
        <div className="min-w-0">
          {breadcrumb?.length ? (
            <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-xs font-medium text-muted">
              {breadcrumb.map((crumb, index) => (
                <span key={crumb.label} className="flex items-center gap-1">
                  {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
                  {crumb.to ? (
                    <Link to={crumb.to} className="transition hover:text-primary-600 dark:hover:text-primary-300">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-ink dark:text-slate-200">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : null}
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="truncate text-xl font-extrabold tracking-tight text-ink dark:text-white sm:text-2xl">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </motion.header>
  );
}

export { PageHeader };
