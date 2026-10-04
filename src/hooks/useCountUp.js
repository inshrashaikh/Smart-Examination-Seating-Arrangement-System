import { useEffect, useRef, useState } from 'react';
import { useInView as useFramerInView, useMotionValue, useSpring } from 'framer-motion';

const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Animated number counter. Starts when the element scrolls into view.
 * Pass `suffix`/`prefix` for formatted display.
 */
export default function useCountUp(target, { duration = 1600, decimals = 0 } = {}) {
  const ref = useRef(null);
  const inView = useFramerInView(ref, { once: true, margin: '-60px' });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 26, stiffness: 90 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!inView) return undefined;
    const value = Number(target) || 0;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = easeOutExpo(progress) * value;
      setDisplay(
        decimals > 0
          ? next.toFixed(decimals)
          : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(next))
      );
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration, decimals]);

  useEffect(() => {
    spring.on('change', (latest) => {
      if (!inView) setDisplay(String(latest));
    });
  }, [spring, inView]);

  return { ref, value: display, springValue: spring };
}

export { useCountUp };
