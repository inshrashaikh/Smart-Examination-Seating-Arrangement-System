import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageCircleQuestion } from 'lucide-react';
import { FAQS } from '../../data/content';
import Reveal, { SectionHeading } from './Reveal';
import Button from '../ui/Button';
import cn from '../../utils/cn';

export default function FAQ() {
  const [open, setOpen] = useState(FAQS[0].id);

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionHeading
              align="left"
              eyebrow="FAQ"
              title="Questions we hear most"
              description="Everything about allocation rules, publishing, exports and access control."
            />
            <Reveal delay={0.15} className="mt-8">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/60">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                  <MessageCircleQuestion className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm font-bold text-ink dark:text-white">Still have questions?</p>
                <p className="mt-1 text-sm text-muted">
                  Our examination-cell team replies within one working day.
                </p>
                <Button className="mt-4" size="sm" variant="secondary">
                  Contact support
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.08}>
            <ul className="divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/60">
              {FAQS.map((faq) => {
                const isOpen = open === faq.id;
                return (
                  <li key={faq.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : faq.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-slate-50/80 dark:hover:bg-white/5"
                    >
                      <span
                        className={cn(
                          'text-[15px] font-bold transition-colors',
                          isOpen ? 'text-primary-600 dark:text-primary-300' : 'text-ink dark:text-white'
                        )}
                      >
                        {faq.question}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                          'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors',
                          isOpen
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                        )}
                      >
                        <Plus className="h-4 w-4" />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <p className="px-5 pb-5 text-[14px] leading-relaxed text-muted">{faq.answer}</p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export { FAQ };
