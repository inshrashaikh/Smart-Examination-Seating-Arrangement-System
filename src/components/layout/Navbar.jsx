import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Sun, Moon, ArrowRight, Github, Twitter, Linkedin, Mail } from 'lucide-react';
import Logo from '../ui/Logo';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import cn from '../../utils/cn';

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Preview', href: '#preview' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('#features');
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, homePath } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = LINKS.map((l) => document.querySelector(l.href)).filter(Boolean);
    if (!sections.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300 no-print',
        scrolled ? 'py-2' : 'py-4'
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav
          className={cn(
            'flex items-center justify-between gap-4 rounded-2xl px-4 py-2.5 transition-all duration-300',
            scrolled
              ? 'glass-strong mx-auto max-w-5xl shadow-soft-lg'
              : 'mx-auto max-w-7xl border border-transparent bg-transparent'
          )}
        >
          <Logo />

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setActive(link.href)}
                  className={cn(
                    'relative rounded-xl px-3.5 py-2 text-[13.5px] font-semibold transition-colors',
                    active === link.href
                      ? 'text-primary-600 dark:text-primary-300'
                      : 'text-slate-600 hover:text-ink dark:text-slate-300 dark:hover:text-white'
                  )}
                >
                  {link.label}
                  {active === link.href ? (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary-600 dark:bg-primary-400"
                    />
                  ) : null}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle colour theme"
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                </motion.span>
              </AnimatePresence>
            </button>

            {isAuthenticated ? (
              <Button as={Link} to={homePath} size="sm" rightIcon={ArrowRight}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button as={Link} to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Login
                </Button>
                <Button as={Link} to="/login" size="sm" rightIcon={ArrowRight} className="hidden sm:inline-flex">
                  Get Started
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-white/10"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="glass-strong mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl p-2 lg:hidden"
            >
              <ul className="space-y-0.5">
                {LINKS.map((link, index) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      {link.label}
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </a>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200/70 p-2 pt-3 dark:border-slate-700/60">
                <Button as={Link} to="/login" variant="secondary" size="sm" fullWidth onClick={() => setOpen(false)}>
                  Login
                </Button>
                <Button as={Link} to="/login" size="sm" fullWidth onClick={() => setOpen(false)}>
                  Get Started
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}

export { LINKS };
export const SOCIAL_LINKS = [
  { label: 'Email', icon: Mail, href: 'mailto:examcell@university.edu' },
  { label: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com' },
  { label: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
  { label: 'GitHub', icon: Github, href: 'https://github.com' },
];

export { Navbar };
