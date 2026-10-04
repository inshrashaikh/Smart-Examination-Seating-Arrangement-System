import { Link } from 'react-router-dom';
import cn from '../../utils/cn';

/** Brand mark: 3×3 seat grid with a gradient. */
export function LogoMark({ className, size = 36 }) {
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-xl shadow-glow', className)}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 45%, #14B8A6 100%)' }}
      />
      <svg viewBox="0 0 24 24" className="relative" width={size * 0.62} height={size * 0.62} aria-hidden="true">
        <g fill="#fff">
          <rect x="2" y="2" width="4.5" height="4.5" rx="1.4" opacity="0.95" />
          <rect x="9.75" y="2" width="4.5" height="4.5" rx="1.4" opacity="0.7" />
          <rect x="17.5" y="2" width="4.5" height="4.5" rx="1.4" opacity="0.45" />
          <rect x="2" y="9.75" width="4.5" height="4.5" rx="1.4" opacity="0.7" />
          <rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1.4" opacity="1" />
          <rect x="17.5" y="9.75" width="4.5" height="4.5" rx="1.4" opacity="0.7" />
          <rect x="2" y="17.5" width="4.5" height="4.5" rx="1.4" opacity="0.45" />
          <rect x="9.75" y="17.5" width="4.5" height="4.5" rx="1.4" opacity="0.7" />
          <rect x="17.5" y="17.5" width="4.5" height="4.5" rx="1.4" opacity="0.95" />
        </g>
      </svg>
    </span>
  );
}

export default function Logo({ to = '/', size = 'md', showText = true, subtitle, className }) {
  const markSize = size === 'sm' ? 30 : size === 'lg' ? 44 : 36;
  return (
    <Link
      to={to}
      className={cn('group inline-flex items-center gap-2.5 rounded-xl', className)}
      aria-label="SeatPlan — home"
    >
      <LogoMark size={markSize} className="transition-transform duration-300 group-hover:scale-105" />
      {showText ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display font-extrabold tracking-tight text-ink dark:text-white',
              size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'
            )}
          >
            Seat<span className="text-gradient">Plan</span>
          </span>
          {subtitle ? (
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}

export { Logo };
