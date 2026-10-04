import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { HOW_IT_WORKS } from '../../data/content';
import Reveal, { SectionHeading } from './Reveal';

/** 4-step animated vertical timeline with a scroll-linked progress line. */
export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-white py-20 dark:bg-slate-900/40 sm:py-28">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps from register to published hall plan"
          description="Most universities finish a full seating cycle inside one working session."
        />

        <div className="relative mt-16">
          {/* timeline rail */}
          <div className="absolute left-[27px] top-2 hidden h-[calc(100%-2rem)] w-px bg-slate-200 sm:block dark:bg-slate-800">
            <motion.div
              className="absolute inset-x-0 top-0 bg-gradient-to-b from-primary-500 via-accent-500 to-transparent"
              initial={{ height: 0 }}
              whileInView={{ height: '100%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
            />
          </div>

          <ol className="space-y-10 sm:space-y-14">
            {HOW_IT_WORKS.map((step, index) => (
              <Reveal key={step.id} delay={index * 0.08} as="li">
                <div className="relative flex gap-6 sm:gap-10">
                  {/* node */}
                  <div className="relative z-10 shrink-0">
                    <motion.span
                      initial={{ scale: 0, rotate: -30 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                      whileHover={{ scale: 1.08 }}
                      className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-glow"
                    >
                      <step.icon className="h-6 w-6" />
                    </motion.span>
                    <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-2xl bg-primary-500/30" />
                    <span className="absolute -left-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[11px] font-extrabold text-primary-600 shadow-soft ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                      {step.id}
                    </span>
                  </div>

                  {/* content */}
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-xl font-extrabold text-ink sm:text-2xl dark:text-white">
                        {step.title}
                      </h3>
                      <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
                        {step.detail}
                      </span>
                    </div>
                    <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted">{step.description}</p>

                    <ul className="mt-4 flex flex-wrap gap-2">
                      {['Validated', 'Audited', 'Reversible'].map((tag) => (
                        <li
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <Check className="h-3 w-3 text-accent-500" strokeWidth={3} />
                          {tag}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={0.12} className="mt-14">
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-6 text-center dark:border-slate-800 dark:from-slate-900/60 dark:to-slate-900/20">
            <p className="text-sm text-muted">
              Average time saved per exam cycle across 40 universities:{' '}
              <span className="font-display text-2xl font-extrabold text-gradient">11 hours 20 minutes</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export { HowItWorks };
