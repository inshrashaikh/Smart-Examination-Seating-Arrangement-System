import { motion } from 'framer-motion';
import cn from '../../utils/cn';

/** Scroll-reveal wrapper: fades + slides children into view once. */
export default function Reveal({ children, delay = 0, y = 28, className, as = 'div', once = true, amount = 0.2 }) {
  const Component = motion[as] ?? motion.div;
  return (
    <Component
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}

/** Section heading with eyebrow, title and optional lead paragraph. */
export function SectionHeading({ eyebrow, title, description, align = 'center', className }) {
  return (
    <Reveal className={cn('max-w-2xl', align === 'center' ? 'mx-auto text-center' : '', className)}>
      {eyebrow ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-primary-200/70 bg-primary-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="mt-4 text-balance font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-balance text-[15px] leading-relaxed text-muted">{description}</p>
      ) : null}
    </Reveal>
  );
}

export { Reveal };
