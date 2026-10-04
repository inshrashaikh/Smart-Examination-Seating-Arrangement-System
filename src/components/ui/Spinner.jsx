import { motion } from 'framer-motion';
import { DEPARTMENTS, getDepartment } from '../../data/departments';
import cn from '../../utils/cn';

export function Spinner({ className, size = 20 }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DotsLoader({ className }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

/**
 * "Allocating seats…" animated SVG: a 6×4 seat grid where desks pop in
 * sequentially while a progress ring and status label animate alongside.
 */
export function SeatAllocationLoader({ progress = 0, status = 'Allocating seats', className }) {
  const cols = 8;
  const rows = 5;
  const seats = Array.from({ length: cols * rows }, (_, i) => i);
  const filled = Math.round((progress / 100) * seats.length);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative">
        {/* rotating dashed ring */}
        <motion.svg
          width="252"
          height="180"
          viewBox="0 0 252 180"
          className="overflow-visible"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <defs>
            <linearGradient id="loaderStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#14B8A6" />
            </linearGradient>
          </defs>

          <rect
            x="4"
            y="4"
            width="244"
            height="172"
            rx="18"
            fill="none"
            stroke="url(#loaderStroke)"
            strokeWidth="2"
            strokeDasharray="10 8"
            opacity="0.5"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 126 90"
              to="360 126 90"
              dur="14s"
              repeatCount="indefinite"
            />
          </rect>

          {seats.map((index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = 26 + col * 26;
            const y = 26 + row * 27;
            const dept = DEPARTMENTS[index % DEPARTMENTS.length];
            const isFilled = index < filled;
            return (
              <motion.rect
                key={index}
                x={x}
                y={y}
                width="18"
                height="18"
                rx="5"
                initial={{ scale: 0, opacity: 0 }}
                animate={
                  isFilled
                    ? { scale: 1, opacity: 1, fill: dept.color, rotate: 0 }
                    : { scale: 0.86, opacity: 0.28, fill: '#94A3B8', rotate: 0 }
                }
                transition={{
                  duration: 0.4,
                  delay: isFilled ? Math.min(index * 0.045, 1.4) : 0,
                  ease: 'backOut',
                }}
                style={{ transformOrigin: `${x + 9}px ${y + 9}px` }}
              />
            );
          })}
        </motion.svg>

        {/* floating sparkle */}
        <motion.span
          className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-xl bg-white shadow-soft dark:bg-slate-800"
          animate={{ y: [0, -8, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <SparkleIcon className="h-4 w-4 text-primary-500" />
        </motion.span>
      </div>

      <p className="mt-5 text-sm font-bold text-ink dark:text-white">{status}</p>
      <p className="mt-1 text-xs text-muted">
        Applying department-mixing rules · checking adjacency constraints
      </p>

      <div className="mt-4 h-1.5 w-64 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
          animate={{ width: `${Math.max(4, progress)}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <p className="mt-2 font-mono text-[11px] font-semibold text-muted">{Math.round(progress)}% · SEED 0x4F46E5</p>
    </div>
  );
}

function SparkleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2zM18.5 14l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6zM6 15l.7 2 2 .7-2 .7L6 20.4l-.7-2-2-.7 2-.7L6 15z" />
    </svg>
  );
}

/** Animated success mark with a conic sweep. */
export function SuccessCheck({ className }) {
  return (
    <motion.svg
      viewBox="0 0 52 52"
      className={cn('h-14 w-14', className)}
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="#10B981"
        strokeWidth="2.5"
        variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1 } }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
      <motion.path
        d="M14 27l8 8 16-16"
        fill="none"
        stroke="#10B981"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0 },
          visible: { pathLength: 1 },
        }}
        transition={{ duration: 0.45, delay: 0.45, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}

/** Confetti burst used after a successful seating generation. */
export function Confetti({ pieces = 40, active = true, className }) {
  if (!active) return null;
  const colors = ['#4F46E5', '#14B8A6', '#F59E0B', '#EC4899', '#3B82F6', '#10B981'];
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      {Array.from({ length: pieces }).map((_, i) => {
        const color = colors[i % colors.length];
        return (
          <motion.span
            key={i}
            className="absolute h-2.5 w-1.5 rounded-[1px]"
            style={{ background: color, left: `${Math.random() * 100}%`, top: '-5%' }}
            initial={{ y: -20, opacity: 1, rotate: 0 }}
            animate={{
              y: ['0vh', '105vh'],
              x: [0, (Math.random() - 0.5) * 240],
              opacity: [1, 1, 0],
              rotate: [0, (Math.random() - 0.5) * 900],
            }}
            transition={{ duration: 2.2 + Math.random() * 1.6, delay: Math.random() * 0.5, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
}

/** Small colour swatch used by legends. */
export function SeatDot({ department, className }) {
  const dept = getDepartment(department);
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full', className)}
      style={{ background: dept.color }}
    />
  );
}

export default Spinner;