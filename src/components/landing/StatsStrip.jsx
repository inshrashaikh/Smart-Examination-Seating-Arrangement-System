import { motion } from 'framer-motion';
import { STATS } from '../../data/content';
import useCountUp from '../../hooks/useCountUp';

function StatCell({ stat, index }) {
  const { ref, value } = useCountUp(stat.value, { duration: 2000 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group relative flex flex-col items-center px-4 py-6 text-center sm:py-8"
    >
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 text-primary-600 transition-transform duration-300 group-hover:scale-110 dark:text-primary-300">
        <stat.icon className="h-5 w-5" />
      </span>
      <p className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
        {value}
        <span className="text-gradient">{stat.suffix}</span>
      </p>
      <p className="mt-1 text-[13px] font-medium text-muted">{stat.label}</p>

      <span className="pointer-events-none absolute inset-x-6 bottom-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-primary-300 to-transparent transition-transform duration-500 group-hover:scale-x-100 dark:via-primary-700" />
    </motion.div>
  );
}

export default function StatsStrip() {
  return (
    <section className="relative border-y border-slate-200/70 bg-white/60 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto w-full max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 divide-x divide-slate-200/70 dark:divide-slate-800 lg:grid-cols-4">
          {STATS.map((stat, index) => (
            <StatCell key={stat.id} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export { StatsStrip };
