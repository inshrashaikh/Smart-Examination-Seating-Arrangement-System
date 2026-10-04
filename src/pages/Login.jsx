import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Users, Mail, Lock, ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle2,
  Sparkles, LayoutGrid, FileBarChart, LogIn, AlertCircle,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { Input, PasswordInput } from '../components/ui/Field';
import { Checkbox } from '../components/ui/Field';
import { Logo } from '../components/ui/Logo';
import { Spinner } from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n/index.jsx';
import { demoAccounts } from '../data/mockDatabase';

const ROLES = [
  {
    value: 'ADMIN',
    label: 'Examination Department',
    description: 'Students, halls, exams, generation, reports and duty allocation.',
    icon: ShieldCheck,
  },
  {
    value: 'FACULTY',
    label: 'Faculty',
    description: 'Your duties, hall plans and attendance sheets — read-only.',
    icon: Users,
  },
];

const HIGHLIGHTS = [
  { icon: LayoutGrid, label: 'Hall plans published instantly' },
  { icon: FileBarChart, label: 'Reports in four formats' },
  { icon: Sparkles, label: 'Zero-clash allocation engine' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export default function Login() {
  const [role, setRole] = useState('ADMIN');
  const [email, setEmail] = useState('admin@exam.com');
  const [password, setPassword] = useState('admin123');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { login, error: authError } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // The 401 interceptor bounces here with ?expired=1 — say why.
  const sessionExpired = searchParams.get('expired') === '1';

  const validate = (values) => {
    const next = {};
    if (!values.email.trim()) next.email = 'Email address is required.';
    else if (!EMAIL_RE.test(values.email)) next.email = 'Enter a valid email address.';
    // Deliberately no length rule: the backend's LoginRequest has none either,
    // and a wrong-password attempt must say "wrong password", not "too short".
    if (!values.password) next.password = 'Password is required.';
    return next;
  };

  /** Fills the form from a seeded account and syncs the role toggle with it. */
  const applyAccount = (account) => {
    setRole(account.roleKey ?? (account.email.includes('admin') ? 'ADMIN' : 'FACULTY'));
    setEmail(account.email);
    setPassword(account.password);
    setErrors({});
    setTouched({});
    setFormError(null);
  };

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    setErrors({});
    setFormError(null);
    const account = demoAccounts.find((a) => a.roleKey === nextRole);
    if (account) applyAccount(account);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const values = { email, password };
    setTouched({ email: true, password: true });
    const validation = validate(values);
    setErrors(validation);
    setFormError(null);
    if (Object.keys(validation).length) {
      toast.warning('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      // `role` is sent along; AuthContext rejects the session if the backend
      // says the account is a different role than the toggle claims.
      const result = await login({ email: values.email.trim(), password, role });
      const signedIn = result?.user ?? {};
      toast.success(`Welcome back, ${String(signedIn.name ?? 'there').split(' ')[0]}!`, {
        title: 'Signed in successfully',
      });

      const from = searchParams.get('from');
      const redirect =
        from ||
        location.state?.from ||
        (signedIn.role === 'FACULTY' ? '/faculty' : '/admin');
      navigate(redirect, { replace: true });
    } catch (error) {
      // 401 → "Invalid email or password"; 403 → the role-mismatch message.
      const message = error?.message ?? 'Sign-in failed. Please try again.';
      setFormError(message);
      setErrors((prev) => ({ ...prev, password: '' }));
      toast.error(message, { title: 'Unable to sign in' });
    } finally {
      setSubmitting(false);
    }
  };

  const activeRole = ROLES.find((r) => r.value === role);
  const banner = useMemo(() => formError ?? authError ?? (sessionExpired ? t('login.sessionExpired') : null), [formError, authError, sessionExpired, t]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ---------------- left: brand panel ---------------- */}
      <div className="relative hidden overflow-hidden bg-slate-950 lg:block">
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80"
          alt="University examination hall"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(79,70,229,0.92) 0%, rgba(30,41,59,0.86) 52%, rgba(20,184,166,0.82) 100%)',
          }}
        />
        <div
          className="absolute -left-20 top-1/4 h-96 w-96 animate-blob rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 right-0 h-96 w-96 animate-blob rounded-full bg-accent-400/20 blur-3xl"
          style={{ animationDelay: '2.5s' }}
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Logo size="lg" showText />

          <div className="max-w-md">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-balance font-display text-4xl font-extrabold leading-tight text-white xl:text-[2.75rem]"
            >
              Every seat planned.
              <br />
              Every clash prevented.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.22 }}
              className="mt-5 text-[15px] leading-relaxed text-white/80"
            >
              Sign in to the examination cell console to generate hall plans, publish them to invigilators
              and export attendance in one click.
            </motion.p>

            <ul className="mt-9 space-y-3.5">
              {HIGHLIGHTS.map((item, index) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.35 + index * 0.1 }}
                  className="flex items-center gap-3 text-[14px] font-semibold text-white/90"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
                    <item.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                  </span>
                  {item.label}
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <div className="flex -space-x-2">
              {['1494790108377-be9c29b29330', '1500648767791-00dcc994a43e', '1573496359142-b8d87734a5a2'].map(
                (id) => (
                  <img
                    key={id}
                    src={`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=80&q=70`}
                    alt=""
                    className="h-9 w-9 rounded-full border-2 border-white/40 object-cover"
                  />
                )
              )}
            </div>
            <p className="text-[13px] leading-snug text-white/85">
              Trusted by <span className="font-bold text-white">40+ universities</span> and{' '}
              <span className="font-bold text-white">1,850 faculty</span>.
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- right: form ---------------- */}
      <div className="flex items-center justify-center bg-surface px-5 py-10 dark:bg-surface-dark sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:justify-end">
            <div className="lg:hidden">
              <Logo size="sm" />
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-primary-600 dark:hover:text-primary-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back to website
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink dark:text-white">
              {t('login.title')}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {t('login.subtitle')}
            </p>
          </motion.div>

          {/* role selector */}
          <div className="mt-7">
            <p className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              {t('login.signingInAs')}
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/70">
              {ROLES.map((option) => {
                const isActive = role === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleRoleChange(option.value)}
                    aria-pressed={isActive}
                    className="relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-bold transition"
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="role-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 -z-10 rounded-xl bg-white shadow-soft dark:bg-slate-900"
                      />
                    ) : null}
                    <option.icon
                      className={isActive ? 'h-4 w-4 text-primary-600' : 'h-4 w-4 text-slate-400'}
                    />
                    <span className={isActive ? 'text-ink dark:text-white' : 'text-slate-500 dark:text-slate-400'}>
                      {option.value === 'ADMIN' ? t('login.admin') : t('login.faculty')}
                    </span>
                  </button>
                );
              })}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={role}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden text-xs text-muted"
              >
                <span className="mt-2 block">
                  {role === 'ADMIN' ? t('login.adminHint') : t('login.facultyHint')}
                </span>
              </motion.p>
            </AnimatePresence>
          </div>

          {/* form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <Input
              label={t('login.email')}
              type="email"
              icon={Mail}
              placeholder="you@university.edu"
              autoComplete="email"
              value={email}
              error={touched.email ? errors.email : ''}
              onBlur={() => {
                setTouched((t) => ({ ...t, email: true }));
                setErrors(validate({ email, password }));
              }}
              onChange={(e) => {
                setEmail(e.target.value);
                if (touched.email) setErrors(validate({ email: e.target.value, password }));
              }}
              required
            />

            <PasswordInput
              label={t('login.password')}
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              error={touched.password ? errors.password : ''}
              onBlur={() => {
                setTouched((t) => ({ ...t, password: true }));
                setErrors(validate({ email, password }));
              }}
              onChange={(e) => {
                setPassword(e.target.value);
                if (touched.password) setErrors(validate({ email, password: e.target.value }));
              }}
              required
            />

            <AnimatePresence mode="wait">
              {banner ? (
                <motion.div
                  key={banner}
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                >
                  <motion.span
                    initial={{ rotate: 0 }}
                    animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="shrink-0"
                  >
                    <AlertCircle className="h-4 w-4" />
                  </motion.span>
                  <span className="min-w-0">{banner}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="flex items-center justify-between gap-3 pt-1">
              <Checkbox
                label="Remember me"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setResetSent(false);
                }}
                className="text-[13px] font-semibold text-primary-600 transition hover:underline dark:text-primary-300"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={submitting}
              leftIcon={submitting ? undefined : LogIn}
              rightIcon={submitting ? undefined : ArrowRight}
              className="!mt-6"
            >
              {submitting ? t('login.signingIn') : t('login.signIn')}
            </Button>
          </form>

          {/* demo accounts */}
          <div className="mt-7 rounded-2xl border border-dashed border-primary-300 bg-primary-50/60 p-4 dark:border-primary-500/30 dark:bg-primary-500/5">
            <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> {t('login.demoAccounts')}
            </p>
            <div className="mt-3 space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => applyAccount(account)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2 text-left transition hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold text-ink dark:text-white">
                      {account.role}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-muted">
                      {account.email} / {account.password}
                    </span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            No account yet?{' '}
            <a href="mailto:examcell@university.edu" className="font-semibold text-primary-600 hover:underline dark:text-primary-300">
              Request a coordinator account
            </a>
          </p>
        </div>
      </div>

      {/* forgot password modal */}
      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset your password"
        description="We'll email you a secure link to choose a new password."
        icon={Lock}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setForgotOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setResetSent(true);
                toast.success('Reset link sent to your inbox.');
              }}
              disabled={resetSent}
            >
              {resetSent ? 'Link sent' : 'Send reset link'}
            </Button>
          </>
        }
      >
        <Input label="Registered email" type="email" icon={Mail} placeholder="you@university.edu" />
        <AnimatePresence>
          {resetSent ? (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4" /> Check your inbox for the reset link.
            </motion.p>
          ) : null}
        </AnimatePresence>
      </Modal>

      {submitting ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="glass-strong flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-muted">
            <Spinner size={14} /> Verifying credentials…
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { Eye, EyeOff };

export { Login };
