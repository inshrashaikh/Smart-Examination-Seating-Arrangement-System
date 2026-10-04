import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MonitorPlay, LayoutGrid, FileBarChart, UserCog, ExternalLink } from 'lucide-react';
import Tabs from '../ui/Tabs';
import Button from '../ui/Button';
import Reveal, { SectionHeading } from './Reveal';
import { SCREENSHOTS } from '../../data/content';
import { DEPARTMENTS } from '../../data/departments';

const ICONS = { dashboard: MonitorPlay, 'hall-plan': LayoutGrid, reports: FileBarChart, faculty: UserCog };

export default function Screenshots() {
  const [active, setActive] = useState(SCREENSHOTS[0].id);
  const current = SCREENSHOTS.find((s) => s.id === active) ?? SCREENSHOTS[0];
  const Icon = ICONS[current.id];

  return (
    <section id="preview" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Product preview"
          title="One console for the examination cell and the invigilator"
          description="Switch between the modules below to see exactly what your team will use on exam day."
        />

        <Reveal delay={0.1} className="mt-12">
          <div className="flex justify-center">
            <Tabs
              value={active}
              onChange={setActive}
              size="sm"
              tabs={SCREENSHOTS.map((s) => ({
                value: s.id,
                label: s.label,
                icon: ICONS[s.id],
              }))}
            />
          </div>
        </Reveal>

        <Reveal delay={0.16} className="mt-10">
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-r from-primary-500/15 via-accent-500/10 to-transparent blur-2xl"
              aria-hidden="true"
            />

            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft-lg dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Icon className="h-3.5 w-3.5" />
                  {current.label}
                </span>
                <span className="h-2.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
              </div>

              <div className="grid gap-0 lg:grid-cols-[1.5fr_1fr]">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800/40">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={current.id}
                      src={current.image}
                      alt={`${current.label} screen preview`}
                      initial={{ opacity: 0, scale: 1.04 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.45 }}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </AnimatePresence>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 to-transparent" />
                </div>

                <div className="flex flex-col justify-between p-6 sm:p-8">
                  <div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={current.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                      >
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                          <Icon className="h-6 w-6" />
                        </span>
                        <h3 className="mt-5 font-display text-2xl font-extrabold text-ink dark:text-white">
                          {current.label}
                        </h3>
                        <p className="mt-2.5 text-sm leading-relaxed text-muted">{current.description}</p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="mt-8">
                    <div className="flex flex-wrap gap-2">
                      {DEPARTMENTS.map((dept) => (
                        <span
                          key={dept.code}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                          style={{ background: dept.soft, color: dept.text }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: dept.color }} />
                          {dept.short}
                        </span>
                      ))}
                    </div>
                    <Button className="mt-6" size="sm" rightIcon={ExternalLink}>
                      Open live demo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export { Screenshots };
