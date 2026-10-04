import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, PlayCircle, Sparkles, ShieldCheck, Zap, Clock } from 'lucide-react';
import Button from '../ui/Button';
import useCountUp from '../../hooks/useCountUp';
import { DEPARTMENTS } from '../../data/departments';

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 sm:pb-28 sm:pt-40 lg:pt-44">
      {/* ---------------- floating gradient blobs ---------------- */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <motion.div
          className="absolute -left-24 top-8 h-[26rem] w-[26rem] rounded-full opacity-60 blur-3xl animate-blob"
          style={{ background: 'radial-gradient(circle at 30% 30%, #4F46E5, transparent 62%)' }}
          animate={{ y: [0, 26, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-20 top-40 h-[24rem] w-[24rem] rounded-full opacity-50 blur-3xl animate-blob"
          style={{ background: 'radial-gradient(circle at 60% 40%, #14B8A6, transparent 62%)' }}
          animate={{ y: [0, -32, 0], scale: [1, 0.94, 1] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl animate-blob"
          animate={{ y: [0, 18, 0], x: [0, 26, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-grid-slate bg-[length:52px_52px] grid-fade opacity-[0.55]" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8">
        {/* ---------------- copy ---------------- */}
        <div>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
            className="inline-flex items-center gap-2 rounded-full border border-primary-200/80 bg-white/80 py-1.5 pl-1.5 pr-4 shadow-soft backdrop-blur dark:border-primary-500/30 dark:bg-slate-900/70"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              <Sparkles className="h-3 w-3" /> New
            </span>
            <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
              Department mixing engine v2 with live clash verification
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="mt-6 text-balance font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[4.1rem] dark:text-white"
          >
            Exam Seating,
            <br />
            <span className="text-gradient animate-gradient">Automated.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-6 max-w-xl text-balance text-[15px] leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300"
          >
            Upload the register, pick the halls, generate a clash-free seating plan and publish it to
            every invigilator — in under four minutes. No spreadsheets, no clashes, no late nights.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button as={Link} to="/login" size="lg" rightIcon={ArrowRight} className="group">
              Get Started
            </Button>
            <Button
              as="a"
              href="#how-it-works"
              size="lg"
              variant="secondary"
              leftIcon={PlayCircle}
              className="group"
            >
              Watch Demo
            </Button>
          </motion.div>

          <motion.ul
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] font-medium text-muted"
          >
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-accent-500" /> Zero-clash guarantee
            </li>
            <li className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" /> Sub-second allocation
            </li>
            <li className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary-500" /> Set up in one afternoon
            </li>
          </motion.ul>
        </div>

        {/* ---------------- animated dashboard mockup ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative perspective"
        >
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary-500/25 via-accent-500/15 to-transparent blur-2xl" />

          <div className="glass-strong overflow-hidden rounded-3xl p-4 shadow-soft-lg sm:p-5">
            {/* window chrome */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="rounded-lg bg-slate-900/5 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                seatplan.app/admin/dashboard
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />
            </div>

            {/* mock stat row */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <MockStat label="Students" value={10248} tone="#4F46E5" delay={0.5} />
              <MockStat label="Halls" value={512} tone="#14B8A6" delay={0.62} />
              <MockStat label="Clashes" value={0} tone="#10B981" delay={0.74} />
            </div>

            {/* mock chart + plan */}
            <div className="mt-3 grid gap-3 sm:grid-cols-[1.15fr_1fr]">
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-900/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Seats allocated / week
                </p>
                <div className="mt-3 flex h-24 items-end gap-1.5">
                  {[38, 52, 44, 68, 60, 82, 74, 96, 88, 100].map((h, i) => (
                    <motion.span
                      key={i}
                      className="flex-1 rounded-t-md"
                      style={{
                        background: `linear-gradient(180deg, #4F46E5 ${40 + (i % 3) * 20}%, #14B8A6)`,
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.8, delay: 0.8 + i * 0.07, ease: 'easeOut' }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px] font-semibold text-slate-400">
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                  <span>Aug</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-900/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Hall A-101 · live
                </p>
                <div className="mt-3 grid grid-cols-6 gap-1">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
                    return (
                      <motion.span
                        key={i}
                        className="aspect-square rounded-[4px]"
                        style={{ background: dept.color }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.35, delay: 1 + i * 0.028, ease: 'backOut' }}
                      />
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {DEPARTMENTS.slice(0, 4).map((dept) => (
                    <span key={dept.code} className="flex items-center gap-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dept.color }} />
                      {dept.short}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* mock activity */}
            <div className="mt-3 space-y-2">
              {[
                { label: 'Hall plan generated', meta: 'EX-003 · 2 halls · 0 clashes', tone: 'bg-emerald-500' },
                { label: 'Duty assigned to Dr. A. Iyer', meta: 'Hall B-205 · tomorrow 10:00', tone: 'bg-primary-500' },
                { label: '184 students imported', meta: 'semester_4.xlsx', tone: 'bg-accent-500' },
              ].map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 + i * 0.12, duration: 0.5 }}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 dark:border-slate-700/50 dark:bg-slate-900/50"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${row.tone}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold text-ink dark:text-white">{row.label}</span>
                    <span className="block truncate text-[10px] text-muted">{row.meta}</span>
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* floating badges */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 1.7, type: 'spring', stiffness: 260, damping: 18 }}
            className="glass absolute -left-4 top-16 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-soft-lg sm:flex"
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[11px] font-bold text-ink dark:text-white">0 clashes</span>
              <span className="block text-[10px] text-muted">verified automatically</span>
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 1.9, type: 'spring', stiffness: 260, damping: 18 }}
            className="glass absolute -right-3 bottom-10 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-soft-lg sm:flex"
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-500/15 text-primary-600">
              <Zap className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[11px] font-bold text-ink dark:text-white">0.8s</span>
              <span className="block text-[10px] text-muted">10,248 students placed</span>
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function MockStat({ label, value, tone, delay }) {
  const { ref, value: display } = useCountUp(value, { duration: 1400 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="rounded-2xl border border-slate-200/70 bg-white/80 p-2.5 sm:p-3 dark:border-slate-700/60 dark:bg-slate-900/60"
    >
      <span className="block h-1.5 w-8 rounded-full" style={{ background: tone }} />
      <span className="mt-2 block font-display text-lg font-extrabold text-ink sm:text-xl dark:text-white">
        {display}
      </span>
      <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    </motion.div>
  );
}

export { Hero };
