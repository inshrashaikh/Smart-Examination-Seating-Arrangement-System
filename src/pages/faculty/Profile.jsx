import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, IdCard, Building2, Save, ShieldCheck, CalendarClock,
  Users, CheckCircle2, Palette, Sun, Moon, KeyRound, History, Award, Lock,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge, { DeptBadge, StatusBadge, Avatar } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Field';
import { ProgressBar } from '../../components/ui/Progress';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, relativeTime } from '../../utils/format';
import cn from '../../utils/cn';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { duties, plans } = useData();
  const toast = useToast();

  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [contact, setContact] = useState({
    name: user?.name ?? '',
    title: user?.title ?? '',
    phone: user?.phone ?? '',
    employeeId: user?.employeeId ?? '',
  });

  const myDuties = useMemo(
    () => duties.filter((d) => d.facultyEmail === user?.email || d.facultyId === user?.id),
    [duties, user]
  );

  const scopedPlans = useMemo(() => {
    const hallIds = new Set(myDuties.map((d) => d.hallId));
    return plans.filter((p) => hallIds.has(p.hallId));
  }, [plans, myDuties]);

  const stats = useMemo(
    () => ({
      total: myDuties.length,
      completed: myDuties.filter((d) => d.status === 'COMPLETED').length,
      upcoming: myDuties.filter((d) => d.status !== 'COMPLETED').length,
      candidates: myDuties.reduce((sum, d) => sum + (d.seatCount ?? 0), 0),
      halls: new Set(myDuties.map((d) => d.hallId)).size,
      chief: myDuties.filter((d) => d.role === 'CHIEF_INVIGILATOR').length,
    }),
    [myDuties]
  );

  const completion = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  const dirty =
    contact.name !== (user?.name ?? '') ||
    contact.title !== (user?.title ?? '') ||
    contact.phone !== (user?.phone ?? '') ||
    contact.employeeId !== (user?.employeeId ?? '');

  /**
   * Saves via `PUT /api/auth/me`.
   *
   * Two things about that endpoint drive this handler, both verified against
   * the live backend:
   *
   * 1. It reuses `RegisterRequest`, whose `required` list is
   *    `[email, name, password, role]` — a partial body is rejected with
   *    "Validation failed: password is required, role is required…". The stored
   *    password is hashed and never reaches the client, so the user has to
   *    re-enter it to save. Hence the confirm-password field.
   * 2. `role` is accepted in the payload but **ignored** server-side — a
   *    faculty member sending `role: "ADMIN"` stays a faculty member, and the
   *    existing JWT keeps its original authorities. It is echoed back here only
   *    because the validator demands it.
   *
   * The old "bio" field was written to `PUT /api/settings`, which is wrong on
   * two counts: that route is ADMIN-only (faculty get 403) and its schema has no
   * `bio` property at all. It is gone rather than silently dropped server-side.
   */
  const save = async () => {
    if (!contact.name.trim()) {
      toast.warning('Your name cannot be empty.');
      return;
    }
    if (!password) {
      toast.warning('Confirm your password — the endpoint requires it to save your profile.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: contact.name.trim(),
        title: contact.title.trim() || null,
        phone: contact.phone.trim() || null,
        employeeId: contact.employeeId.trim() || null,
        email: user?.email,
        role: user?.role,
        password,
      });
      setPassword('');
      toast.success('Profile saved.');
    } catch (error) {
      toast.error(error?.message ?? 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Profile" subtitle="Invigilator Portal">
      <PageHeader
        eyebrow="Account"
        icon={User}
        title="My profile"
        subtitle="Your details appear on attendance sheets and invigilation certificates."
        breadcrumb={[{ label: 'Invigilator Portal', to: '/faculty' }, { label: 'Profile' }]}
        actions={
          <Button leftIcon={Save} loading={saving} disabled={!dirty} onClick={save}>
            Save changes
          </Button>
        }
      />

      {/* ---------------- identity banner ---------------- */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 p-6 text-white shadow-soft-lg"
      >
        <motion.span
          className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/15 blur-3xl"
          animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar name={user?.name} photo={user?.photo} department={user?.department} size={88} />
            <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 ring-4 ring-primary-600">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-2xl font-extrabold">{user?.name}</h2>
            <p className="mt-0.5 text-sm text-white/85">
              {user?.title ?? 'Faculty'} · {user?.department ?? '—'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className="!bg-white/20 !text-white !ring-white/25">
                <IdCard className="h-3 w-3" /> {user?.employeeId ?? '—'}
              </Badge>
              <Badge className="!bg-white/20 !text-white !ring-white/25">
                <ShieldCheck className="h-3 w-3" /> Verified invigilator
              </Badge>
              {user?.department ? (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold">
                  {user.department} department
                </span>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">Member since</p>
            <p className="mt-0.5 text-sm font-bold">{formatDate(new Date())}</p>
            <p className="mt-1 text-[11px] text-white/75">{stats.total} duties logged</p>
          </div>
        </div>
      </motion.div>

      {/* ---------------- stats ---------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="Total duties" value={stats.total} icon={CalendarClock} tone="primary" hint={`${stats.chief} as chief invigilator`} />
        <StatCard index={1} label="Completed" value={stats.completed} icon={CheckCircle2} tone="emerald" hint={`${completion}% of assignments`} />
        <StatCard index={2} label="Candidates supervised" value={stats.candidates} icon={Users} tone="violet" hint={`${stats.halls} halls covered`} />
        <StatCard index={3} label="Upcoming" value={stats.upcoming} icon={CalendarClock} tone="amber" hint="Next duty on the dashboard" />
      </div>

      {/* ---------------- details ---------------- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              action={
                dirty ? (
                  <Badge tone="warning" dot>
                    Unsaved changes
                  </Badge>
                ) : null
              }
            >
              <CardTitle icon={User} title="Personal details" subtitle="Shown to the examination cell" />
            </CardHeader>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} icon={User} />
              <Input label="Email address" value={user?.email ?? ''} disabled icon={Mail} hint="Managed by the university directory" />
              <Input label="Designation" value={contact.title} onChange={(e) => setContact({ ...contact, title: e.target.value })} icon={Award} />
              <Input label="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} icon={Phone} />
              <Input label="Employee ID" value={contact.employeeId} disabled icon={IdCard} />
              <Input label="Department" value={user?.department ?? ''} disabled icon={Building2} />
            </div>

            {/* The endpoint's `required` list includes `password`, so a save
                cannot be confirmed without re-entering it. It is sent once and
                cleared again on success — never stored. */}
            <AnimatePresence initial={false}>
              {dirty ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <Input
                      label="Confirm your password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={Lock}
                      placeholder="Your login password"
                      hint="PUT /api/auth/me requires name, email, role and password together, so the password must be re-entered to confirm the change."
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-[12px] text-muted">
                {dirty ? 'You have unsaved changes.' : 'Everything is up to date.'}
              </p>
              <Button leftIcon={Save} loading={saving} disabled={!dirty || !password} onClick={save}>
                Save changes
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader
              action={
                <Button as={Link} to="/faculty/duties" size="sm" variant="ghost">
                  View all
                </Button>
              }
            >
              <CardTitle icon={History} title="Duty history" subtitle="Your recent invigilation record" />
            </CardHeader>

            {myDuties.length ? (
              <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {myDuties.slice(0, 6).map((duty) => (
                  <li key={duty.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-[11px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {new Date(duty.date).getDate()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-ink dark:text-white">{duty.examTitle}</p>
                      <p className="truncate text-[11px] text-muted">
                        {duty.hallName} · {duty.seatCount} candidates · {relativeTime(duty.date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <StatusBadge status={duty.role} size="sm" />
                      <StatusBadge status={duty.status} size="sm" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-muted">
                  No duties recorded yet. They appear here as soon as the examination cell assigns you a hall.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* ---------------- side column ---------------- */}
        <div className="space-y-5">
          <Card>
            <CardTitle icon={Palette} title="Appearance" subtitle="Theme preference" />
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
              ].map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'rounded-2xl border p-3.5 text-left transition',
                      isActive
                        ? 'border-primary-500 bg-primary-50/70 shadow-glow dark:border-primary-400 dark:bg-primary-500/10'
                        : 'border-slate-200 hover:border-primary-300 dark:border-slate-700 dark:bg-slate-900/50'
                    )}
                  >
                    <Icon className="h-5 w-5 text-primary-600 dark:text-primary-300" />
                    <p className="mt-2 text-[13px] font-bold text-ink dark:text-white">{option.label}</p>
                    <p className="text-[10.5px] text-muted">{isActive ? 'Currently active' : 'Switch theme'}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardTitle icon={Award} title="Term summary" subtitle="Your invigilation record" />
            <div className="mt-4 space-y-3.5">
              <ProgressBar value={completion} tone="emerald" showLabel label="Duties completed" />
              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Chief invigilator</span>
                  <span className="font-bold text-ink dark:text-slate-100">{stats.chief}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Halls covered</span>
                  <span className="font-bold text-ink dark:text-slate-100">{stats.halls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Plans referenced</span>
                  <span className="font-bold text-ink dark:text-slate-100">{scopedPlans.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Account role</span>
                  <DeptBadge code={user?.department} size="sm" />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle icon={KeyRound} title="Security" subtitle="Session and access" />
            <ul className="mt-4 space-y-2.5 text-[12.5px] text-muted">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Signed in as <span className="font-semibold text-ink dark:text-slate-200">{user?.email}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Role-based access to halls and attendance only
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                Every seat swap and attendance change is audit logged
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export { Profile };
