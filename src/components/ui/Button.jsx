import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import cn from '../../utils/cn';

const VARIANTS = {
  primary:
    'bg-primary-600 text-white shadow-glow hover:bg-primary-700 active:bg-primary-800 disabled:hover:bg-primary-600',
  accent:
    'bg-accent-600 text-white shadow-glow-accent hover:bg-accent-700 active:bg-accent-800',
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-ink active:bg-slate-100 dark:bg-slate-800/70 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700/70 dark:hover:text-white',
  outline:
    'bg-transparent text-primary-600 ring-1 ring-inset ring-primary-200 hover:bg-primary-50 dark:text-primary-300 dark:ring-primary-500/40 dark:hover:bg-primary-500/10',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-ink dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
  danger:
    'bg-rose-600 text-white shadow-soft hover:bg-rose-700 active:bg-rose-800',
  softDanger:
    'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
  white: 'bg-white text-primary-700 shadow-soft-lg hover:bg-slate-50',
};

const SIZES = {
  xs: 'h-8 gap-1.5 px-2.5 text-xs rounded-lg',
  sm: 'h-9 gap-2 px-3.5 text-[13px] rounded-xl',
  md: 'h-10 gap-2 px-4 text-sm rounded-xl',
  lg: 'h-12 gap-2.5 px-6 text-[15px] rounded-2xl',
  icon: 'h-10 w-10 rounded-xl',
  iconSm: 'h-8 w-8 rounded-lg',
  iconLg: 'h-12 w-12 rounded-2xl',
};

const BASE =
  'relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-dark active:scale-[0.98]';

/**
 * Button
 * @example <Button variant="primary" loading={saving} onClick={save}>Save</Button>
 * @example <Button as={Link} to="/admin">Go</Button>
 */
const Button = forwardRef(function Button(
  {
    as,
    to,
    href,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    iconOnly = false,
    fullWidth = false,
    className,
    children,
    ...props
  },
  ref
) {
  const Comp = as ?? (to ? Link : href ? 'a' : 'button');
  const isNativeButton = Comp === 'button';
  const classes = cn(
    BASE,
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    fullWidth && 'w-full',
    iconOnly && 'px-0',
    className
  );

  return (
    <Comp
      ref={ref}
      to={to}
      href={href}
      className={classes}
      disabled={isNativeButton ? disabled || loading : undefined}
      aria-disabled={!isNativeButton && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : LeftIcon ? (
        <LeftIcon className={cn('shrink-0', size === 'lg' ? 'h-5 w-5' : size === 'iconLg' ? 'h-6 w-6' : 'h-4 w-4')} aria-hidden="true" />
      ) : null}
      {children ? <span className="truncate">{children}</span> : null}
      {!loading && RightIcon ? (
        <RightIcon className={cn('shrink-0', size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden="true" />
      ) : null}
    </Comp>
  );
});

export default Button;
export { Button, VARIANTS as BUTTON_VARIANTS, SIZES as BUTTON_SIZES };