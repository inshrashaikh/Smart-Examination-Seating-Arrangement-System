import { motion } from 'framer-motion';
import { Spinner } from './Spinner';

/** Full-screen loader used while route chunks lazy-load. */
export default function RouteLoader({ label = 'Loading your workspace…' }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-surface dark:bg-surface-dark">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative grid h-16 w-16 place-items-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-primary-500/25" />
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-glow">
            <Spinner size={22} />
          </span>
        </div>
        <p className="text-sm font-semibold text-muted">{label}</p>
      </motion.div>
    </div>
  );
}

export { RouteLoader };
