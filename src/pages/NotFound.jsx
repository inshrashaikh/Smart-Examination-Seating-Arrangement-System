import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Compass } from 'lucide-react';
import Button from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { isAuthenticated, homePath } = useAuth();

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-surface px-5 dark:bg-surface-dark">
      <div
        className="pointer-events-none absolute -left-24 top-10 h-96 w-96 animate-blob rounded-full bg-primary-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-10 h-96 w-96 animate-blob rounded-full bg-accent-500/20 blur-3xl"
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-lg text-center"
      >
        <div className="mb-8 flex justify-center">
          <Logo size="sm" />
        </div>

        <span className="grid h-16 w-16 mx-auto place-items-center rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-glow">
          <Compass className="h-7 w-7" />
        </span>

        <p className="mt-7 font-display text-7xl font-extrabold tracking-tight text-gradient">404</p>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-ink dark:text-white">
          This hall isn't on the seating chart
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          The page you're looking for was moved, renamed, or never existed. Let's get you back to a
          seat.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Button as={Link} to="/" leftIcon={ArrowLeft}>
            Back to home
          </Button>
          {isAuthenticated ? (
            <Button as={Link} to={homePath} leftIcon={Home}>
              Go to dashboard
            </Button>
          ) : (
            <Button as={Link} to="/login" variant="secondary" leftIcon={Home}>
              Sign in
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export { NotFound };
