import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, ArrowUpRight } from 'lucide-react';
import Logo from '../ui/Logo';
import { SOCIAL_LINKS } from './Navbar';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it Works', href: '#how-it-works' },
      { label: 'Product Preview', href: '#preview' },
      { label: 'Pricing', href: '#cta' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Examination Cell', href: '/login' },
      { label: 'Invigilators', href: '/login' },
      { label: 'Departments', href: '#features' },
      { label: 'Reports & Analytics', href: '#features' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#faq' },
      { label: 'Help Centre', href: '#faq' },
      { label: 'API Reference', href: '#faq' },
      { label: 'Changelog', href: '#testimonials' },
    ],
  },
];

export default function Footer() {
  return (
    <footer id="contact" className="relative overflow-hidden border-t border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/40 no-print">
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand + contact */}
          <div>
            <Logo size="lg" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              SeatPlan automates examination seating — allocating halls, mixing departments, publishing
              hall plans and generating reports in minutes, not days.
            </p>

            <ul className="mt-6 space-y-2.5 text-sm text-muted">
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-primary-500" />
                Examination Cell, Academic Block A, Prestige Institute of Technology
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary-500" />
                <a href="mailto:examcell@university.edu" className="hover:text-primary-600 dark:hover:text-primary-300">
                  examcell@university.edu
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary-500" />
                +91 20 2555 0100
              </li>
            </ul>

            <div className="mt-6 flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.label === 'Email' ? undefined : '_blank'}
                  rel="noreferrer"
                  aria-label={social.label}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:-translate-y-0.5 hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-primary-500 dark:hover:text-primary-300"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-ink dark:text-white">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('#') ? (
                        <a
                          href={link.href}
                          className="group inline-flex items-center gap-1 text-sm text-muted transition hover:text-primary-600 dark:hover:text-primary-300"
                        >
                          {link.label}
                          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="group inline-flex items-center gap-1 text-sm text-muted transition hover:text-primary-600 dark:hover:text-primary-300"
                        >
                          {link.label}
                          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/70 pt-6 sm:flex-row dark:border-slate-800">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} SeatPlan · Smart Examination Seating Arrangement System. Built for
            universities.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
            <a href="#faq" className="hover:text-primary-600 dark:hover:text-primary-300">
              Privacy Policy
            </a>
            <a href="#faq" className="hover:text-primary-600 dark:hover:text-primary-300">
              Terms of Service
            </a>
            <a href="#faq" className="hover:text-primary-600 dark:hover:text-primary-300">
              Accessibility
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
