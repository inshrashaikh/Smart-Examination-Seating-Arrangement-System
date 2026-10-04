import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/** Fade + slide page transition applied to every dashboard route. */
export default function PageTransition({ children, className }) {
  const { pathname } = useLocation();

  return (
    <motion.main
      key={pathname}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.main>
  );
}

export { PageTransition };
