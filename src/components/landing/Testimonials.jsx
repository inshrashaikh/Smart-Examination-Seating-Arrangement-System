import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { TESTIMONIALS } from '../../data/content';
import Reveal, { SectionHeading } from './Reveal';
import { Avatar } from '../ui/Badge';
import { initials } from '../../utils/format';
import cn from '../../utils/cn';

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  const go = useCallback((next) => {
    setDirection(next > 0 || next < 0 ? 1 : 0);
    setIndex((prev) => (prev + next + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(id);
  }, [paused]);

  const current = TESTIMONIALS[index];

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-white py-20 dark:bg-slate-900/40 sm:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="pointer-events-none absolute right-0 top-1/4 h-80 w-80 rounded-full bg-accent-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Testimonials"
          title="Trusted by examination cells and invigilators"
          description="Coordinators, department heads and faculty — here's what changed after switching to SeatPlan."
        />

        <Reveal delay={0.1} className="mt-12">
          <div className="relative min-h-[290px] sm:min-h-[270px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.blockquote
                key={current.id}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: direction * -40, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-7 shadow-soft sm:p-10 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-900/30"
              >
                <Quote className="absolute right-7 top-7 h-14 w-14 text-primary-500/10 dark:text-primary-400/15" />

                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-4 w-4',
                        i < current.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200 dark:text-slate-700'
                      )}
                    />
                  ))}
                </div>

                <p className="mt-5 text-balance font-display text-lg font-medium leading-relaxed text-ink sm:text-xl dark:text-slate-100">
                  “{current.quote}”
                </p>

                <footer className="mt-7 flex items-center gap-3">
                  <Avatar name={current.name} photo={current.photo || undefined} size={48} />
                  <div className="min-w-0">
                    <cite className="block truncate text-sm font-bold not-italic text-ink dark:text-white">
                      {current.name}
                    </cite>
                    <span className="block truncate text-xs text-muted">
                      {current.role} · {current.institution}
                    </span>
                  </div>
                  <span className="ml-auto hidden font-mono text-xs text-slate-300 sm:block dark:text-slate-700">
                    0{index + 1}/{TESTIMONIALS.length}
                  </span>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>
        </Reveal>

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            {TESTIMONIALS.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setDirection(i > index ? 1 : -1);
                  setIndex(i);
                }}
                aria-label={`Show testimonial from ${item.name}`}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  i === index ? 'w-8 bg-primary-600' : 'w-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700'
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous testimonial"
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary-500"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next testimonial"
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary-500"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Reveal delay={0.15} className="mt-10">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {TESTIMONIALS.map((item) => (
              <span
                key={item.id}
                title={item.name}
                className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary-500/10 to-accent-500/10 text-[11px] font-bold text-primary-700 dark:text-primary-300"
              >
                {item.photo ? <img src={item.photo} alt="" className="h-10 w-10 rounded-full object-cover" loading="lazy" /> : initials(item.name)}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export { Testimonials };
