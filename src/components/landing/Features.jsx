import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { FEATURES } from '../../data/content';
import Reveal, { SectionHeading } from './Reveal';
import { INTEGRATIONS } from '../../data/content';
import cn from '../../utils/cn';

const ACCENTS = {
  primary: {
    tile: 'from-primary-500/12 to-primary-500/0',
    icon: 'bg-primary-600 text-white shadow-glow',
    dot: 'bg-primary-500',
    border: 'group-hover:border-primary-300 dark:group-hover:border-primary-500/40',
  },
  accent: {
    tile: 'from-accent-500/12 to-accent-500/0',
    icon: 'bg-accent-600 text-white shadow-glow-accent',
    dot: 'bg-accent-500',
    border: 'group-hover:border-accent-300 dark:group-hover:border-accent-500/40',
  },
  amber: {
    tile: 'from-amber-500/14 to-amber-500/0',
    icon: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
    border: 'group-hover:border-amber-300 dark:group-hover:border-amber-500/40',
  },
  sky: {
    tile: 'from-sky-500/14 to-sky-500/0',
    icon: 'bg-sky-500 text-white',
    dot: 'bg-sky-500',
    border: 'group-hover:border-sky-300 dark:group-hover:border-sky-500/40',
  },
  violet: {
    tile: 'from-violet-500/14 to-violet-500/0',
    icon: 'bg-violet-500 text-white',
    dot: 'bg-violet-500',
    border: 'group-hover:border-violet-300 dark:group-hover:border-violet-500/40',
  },
  rose: {
    tile: 'from-rose-500/14 to-rose-500/0',
    icon: 'bg-rose-500 text-white',
    dot: 'bg-rose-500',
    border: 'group-hover:border-rose-300 dark:group-hover:border-rose-500/40',
  },
};

export default function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Everything included"
          title="Six modules that replace the entire exam-planning workflow"
          description="From the first student upload to the final attendance sheet — no exports between tools, no manual copy-paste, no clashes."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const accent = ACCENTS[feature.accent] ?? ACCENTS.primary;
            return (
              <Reveal key={feature.id} delay={index * 0.07}>
                <motion.article
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className={cn(
                    'group relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft transition-colors dark:border-slate-800 dark:bg-slate-900/60',
                    accent.border
                  )}
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br blur-2xl transition-opacity duration-500 group-hover:opacity-100',
                      accent.tile,
                      'opacity-0'
                    )}
                  />
                  <span
                    className={cn(
                      'relative grid h-12 w-12 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3',
                      accent.icon
                    )}
                  >
                    <feature.icon className="h-6 w-6" />
                  </span>

                  <h3 className="relative mt-5 text-base font-bold text-ink dark:text-white">{feature.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>

                  <ul className="relative mt-4 space-y-1.5">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400">
                        <span className={cn('grid h-4 w-4 place-items-center rounded-full', accent.dot)}>
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
                        </span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </motion.article>
              </Reveal>
            );
          })}
        </div>

        {/* Integration marquee */}
        <Reveal delay={0.1} className="mt-14">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/40">
            <p className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Works with your existing stack
            </p>
            <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
              <div className="flex shrink-0 animate-marquee-x gap-3 pr-3">
                {[...INTEGRATIONS, ...INTEGRATIONS].map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className="whitespace-nowrap rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-soft dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export { Features };
