import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Reveal from './Reveal';

const PROOF = ['Free for 1 exam cycle', 'No credit card', 'Setup in 15 minutes'];

export default function CTABanner() {
  return (
    <section id="cta" className="relative overflow-hidden py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 px-6 py-14 text-center shadow-soft-lg sm:px-14 sm:py-20">
            {/* decorative */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute -left-16 -top-16 h-64 w-64 animate-blob rounded-full bg-white/15 blur-2xl" />
              <div className="absolute -bottom-20 -right-10 h-72 w-72 animate-blob rounded-full bg-white/10 blur-2xl" style={{ animationDelay: '2s' }} />
              <div className="absolute inset-0 bg-grid-slate bg-[length:44px_44px] opacity-[0.18]" />
            </div>

            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Next exam cycle awaits
              </span>

              <h2 className="mt-6 text-balance font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-[2.75rem]">
                Stop planning seating charts by hand.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-white/85">
                Join the examination cells that now generate a verified, clash-free seating plan for
                every hall in under four minutes.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Button
                  as={Link}
                  to="/login"
                  size="lg"
                  variant="white"
                  rightIcon={ArrowRight}
                  className="w-full sm:w-auto"
                >
                  Start free trial
                </Button>
                <Button
                  as="a"
                  href="#how-it-works"
                  size="lg"
                  className="w-full border border-white/40 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
                >
                  See how it works
                </Button>
              </motion.div>

              <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {PROOF.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-[13px] font-semibold text-white/90">
                    <CheckCircle2 className="h-4 w-4" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export { CTABanner };
