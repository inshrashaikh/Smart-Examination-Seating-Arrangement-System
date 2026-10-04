import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, User, Palette, Bell, Database, Save, Sun, Moon,
  Monitor, RefreshCw, KeyRound, ShieldCheck, Server, CheckCircle2, Info,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge, { Avatar, DeptBadge } from '../../components/ui/Badge';
import { Input, Select, Switch } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useI18n, LANGUAGES } from '../../i18n/index.jsx';
import { dashboardService } from '../../services';
import { ACADEMIC_YEAR } from '../../data/departments';
import { formatDate } from '../../utils/format';
import cn from '../../utils/cn';

const SECTIONS = [
  { value: 'profile', label: 'Profile', tkey: 'settings.profile', icon: User },
  { value: 'appearance', label: 'Appearance', tkey: 'settings.appearance', icon: Palette },
  { value: 'notifications', label: 'Notifications', tkey: 'settings.notifications', icon: Bell },
  { value: 'institution', label: 'Institution', tkey: 'settings.institution', icon: Database },
];

/**
 * Fallback used only for the very first paint, before `GET /api/settings`
 * answers. Every field exists on `SettingsRequest`; the server is the source of
 * truth the moment the fetch resolves, and this object is only ever a baseline
 * so the controlled inputs have a shape on first render.
 */
const DEFAULTS = {
  theme: 'light',
  density: 'comfortable',
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  weeklyDigest: true,
  clashAlerts: true,
  autoPublish: false,
  language: 'en',
  institution: 'University Examination Cell',
  academicYear: ACADEMIC_YEAR,
  academicStartDate: '2026-01-01',
  dailyUploadDeadline: null,
};

/**
 * Settings centre — profile, theme, notification preferences and institution
 * metadata.
 *
 * Two separate persistence paths, matching two separate backend resources:
 *  - **Preferences and institution metadata** → `GET`/`PUT /api/settings`
 *    (ADMIN-only in the security rules; this page is admin-only).
 *  - **Personal profile** → `PUT /api/auth/me`.
 *
 * `PUT /api/auth/me` reuses `RegisterRequest`, whose `required` list is
 * `[email, name, password, role]`, so a partial body is rejected. The password
 * is hashed server-side and never sent to the client, which is why saving the
 * profile asks for it again.
 */
export default function Settings() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const { students, halls, exams, faculty, plans, refreshAll } = useData();
  const toast = useToast();
  const { t, language, setLanguage } = useI18n();

  const [section, setSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(() => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    title: user?.title ?? '',
    department: user?.department ?? '',
    phone: user?.phone ?? '',
    employeeId: user?.employeeId ?? '',
  }));
  const [password, setPassword] = useState('');
  const [prefs, setPrefs] = useState(DEFAULTS);
  /** Server's copy, so "dirty" means "differs from the server" not "differs from a constant". */
  const [saved, setSaved] = useState(DEFAULTS);

  useEffect(() => {
    setProfile({
      name: user?.name ?? '',
      email: user?.email ?? '',
      title: user?.title ?? '',
      department: user?.department ?? '',
      phone: user?.phone ?? '',
      employeeId: user?.employeeId ?? '',
    });
  }, [user]);

  /** Hydrates preferences from `GET /api/settings` once, on mount. */
  useEffect(() => {
    let cancelled = false;
    dashboardService
      .getSettings()
      .then((remote) => {
        if (cancelled || !remote) return;
        // Merge rather than replace: the response may omit keys on older builds.
        const next = { ...DEFAULTS, ...remote };
        setPrefs(next);
        setSaved(next);
      })
      .catch(() => {
        /* The interceptor already surfaced the reason; DEFAULTS keeps the form usable. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const profileDirty = useMemo(() => {
    const current = {
      name: user?.name ?? '',
      email: user?.email ?? '',
      title: user?.title ?? '',
      department: user?.department ?? '',
      phone: user?.phone ?? '',
      employeeId: user?.employeeId ?? '',
    };
    return Object.keys(current).some((key) => current[key] !== profile[key]);
  }, [profile, user]);

  const prefsDirty = useMemo(
    () => Object.keys(DEFAULTS).some((key) => prefs[key] !== saved[key]),
    [prefs, saved]
  );

  const persist = async (patch, message) => {
    setSaving(true);
    try {
      const saved_ = await dashboardService.updateSettings(patch);
      // Adopt whatever the server stored rather than the patch we sent — it may
      // normalise or reject individual fields.
      const next = { ...prefs, ...(saved_ ?? patch) };
      setPrefs(next);
      setSaved(next);
      toast.success(message);
    } catch (error) {
      toast.error(error?.message ?? 'Could not save your settings.');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!profile.name.trim()) {
      toast.warning('Your name cannot be empty.');
      return;
    }
    if (!password) {
      toast.warning('Confirm your password — PUT /api/auth/me requires it alongside your name, email and role.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: profile.name.trim(),
        title: profile.title.trim() || null,
        department: profile.department.trim() || null,
        phone: profile.phone.trim() || null,
        employeeId: profile.employeeId.trim() || null,
        email: user?.email,
        role: user?.role,
        password,
      });
      setPassword('');
      toast.success('Profile updated.');
    } catch (error) {
      toast.error(error?.message ?? 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const savePrefs = async () => {
    await persist(prefs, 'Preferences saved.');
  };

  /**
   * Discards unsaved edits. It does **not** write `DEFAULTS` to the server —
   * `saved` holds whatever the server last returned, so "reset" means "go back
   * to what is actually stored", which is the only honest meaning once the form
   * has been hydrated from `GET /api/settings`.
   */
  const resetPrefs = () => {
    setPrefs(saved);
    toast.info('Reverted to the last saved values.');
  };

  const handleRefresh = async () => {
    setSaving(true);
    try {
      await refreshAll();
      toast.success('Reference data reloaded from the server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Settings" subtitle="Examination Cell · Preferences">
      <PageHeader
        eyebrow="Configuration"
        icon={SettingsIcon}
        title={t('settings.title')}
        subtitle="Manage your account, appearance, notification preferences and institution defaults."
        breadcrumb={[
          { label: 'Examination Cell', to: '/admin' },
          { label: 'Settings' },
        ]}
        actions={
          (section === 'notifications' || section === 'institution') && prefsDirty ? (
            <>
              <Button variant="secondary" onClick={resetPrefs} disabled={saving}>
                Reset defaults
              </Button>
              <Button leftIcon={Save} loading={saving} onClick={savePrefs}>
                Save preferences
              </Button>
            </>
          ) : section === 'profile' ? (
            <Button leftIcon={Save} loading={saving} disabled={!profileDirty || !password} onClick={saveProfile}>
              Save profile
            </Button>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* ---------------- section nav ---------------- */}
        <div className="space-y-4">
          <Card padded={false} className="overflow-hidden">
            <nav className="p-2">
              {SECTIONS.map((item) => {
                const Icon = item.icon;
                const isActive = section === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSection(item.value)}
                    className={cn(
                      'relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition',
                      isActive
                        ? 'text-primary-700 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                    )}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="settings-active"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className="absolute inset-0 rounded-xl bg-primary-50 dark:bg-primary-500/15"
                      />
                    ) : null}
                    <Icon className="relative z-10 h-4 w-4 shrink-0" />
                    <span className="relative z-10">{t(item.tkey)}</span>
                  </button>
                );
              })}
            </nav>
          </Card>

          <Card>
            <CardTitle icon={ShieldCheck} title="Session" subtitle="Signed-in identity" />
            <div className="mt-4 flex items-center gap-3">
              <Avatar name={user?.name} photo={user?.photo} department={user?.department} size={44} />
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-ink dark:text-white">{user?.name}</p>
                <p className="truncate text-[11px] text-muted">{user?.email}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge tone="primary" size="sm" dot>
                {user?.role === 'ADMIN' ? 'Examination Cell' : 'Faculty'}
              </Badge>
              {user?.department && !['CSE', 'IT', 'ECE', 'MECH', 'CIVIL'].includes(user.department) ? (
                <Badge tone="slate" size="sm">
                  {user.department}
                </Badge>
              ) : user?.department ? (
                <DeptBadge code={user.department} size="sm" />
              ) : null}
            </div>
          </Card>
        </div>

        {/* ---------------- section body ---------------- */}
        <div className="space-y-5">
          {/* ================= profile ================= */}
          {section === 'profile' ? (
            <Card>
              <CardHeader>
                <CardTitle
                  icon={User}
                  title="Profile"
                  subtitle="Used on generated hall plans, reports and audit trails."
                />
              </CardHeader>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  icon={User}
                />
                <Input
                  label="Email address"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  icon={KeyRound}
                />
                <Input
                  label="Designation"
                  value={profile.title}
                  onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                />
                <Input
                  label="Department / cell"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                />
                <Input
                  label="Phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
                <Input
                  label="Employee ID"
                  value={profile.employeeId}
                  disabled
                  hint="Assigned by the HR system"
                />
              </div>

              {/* `PUT /api/auth/me` validates the whole `RegisterRequest`, and
                  `password` is in its `required` list, so a save cannot be
                  confirmed without re-entering it. Sent once, cleared on success. */}
              {profileDirty ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <Input
                    label="Confirm your password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={KeyRound}
                    placeholder="Your login password"
                    hint="Required by the endpoint alongside name, email and role. Not stored in the browser."
                  />
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-[12px] text-muted">
                  {profileDirty ? 'You have unsaved profile changes.' : 'Everything is up to date.'}
                </p>
                <Button leftIcon={Save} loading={saving} disabled={!profileDirty || !password} onClick={saveProfile}>
                  Save profile
                </Button>
              </div>
            </Card>
          ) : null}

          {/* ================= appearance ================= */}
          {section === 'appearance' ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle icon={Palette} title="Theme" subtitle="Applies instantly across the app" />
                </CardHeader>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
                          'group relative overflow-hidden rounded-2xl border p-4 text-left transition-all',
                          isActive
                            ? 'border-primary-500 bg-primary-50/70 shadow-glow dark:border-primary-400 dark:bg-primary-500/10'
                            : 'border-slate-200 hover:border-primary-300 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900/50'
                        )}
                      >
                        <div
                          className={cn(
                            'mb-3 h-20 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700',
                            option.value === 'light' ? 'bg-[#F8FAFC]' : 'bg-[#0B1120]'
                          )}
                        >
                          <div className="flex h-full">
                            <div className="w-1/4 bg-white/80 dark:bg-slate-900/70" />
                            <div className="flex-1 space-y-1.5 p-2">
                              <div className="h-2 w-3/4 rounded bg-gradient-to-r from-primary-500 to-accent-500" />
                              <div className={cn('h-5 rounded', option.value === 'light' ? 'bg-white' : 'bg-slate-800')} />
                              <div className={cn('h-5 rounded', option.value === 'light' ? 'bg-white' : 'bg-slate-800')} />
                            </div>
                          </div>
                        </div>
                        <p className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white">
                          <Icon className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                          {option.label}
                          {isActive ? (
                            <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
                          ) : null}
                        </p>
                      </button>
                    );
                  })}

                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
                    <p className="flex items-center gap-2 text-sm font-bold text-muted">
                      <Monitor className="h-4 w-4" /> System preference
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">
                      Currently rendering in <strong className="text-ink dark:text-white">{isDark ? 'dark' : 'light'}</strong>{' '}
                      mode. The first visit follows your OS setting.
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle icon={Database} title="Display density" subtitle="Affects tables and cards" />
                </CardHeader>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  {[
                    { value: 'compact', label: 'Compact' },
                    { value: 'comfortable', label: 'Comfortable' },
                    { value: 'spacious', label: 'Spacious' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPrefs({ ...prefs, density: option.value })}
                      className={cn(
                        'rounded-xl border px-4 py-2.5 text-[13px] font-bold transition',
                        prefs.density === option.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-500/15 dark:text-primary-200'
                          : 'border-slate-200 text-slate-600 hover:border-primary-300 dark:border-slate-700 dark:text-slate-300'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Card>
            </>
          ) : null}

          {/* ================= notifications ================= */}
          {section === 'notifications' ? (
            <Card>
              <CardHeader
                action={
                  prefsDirty ? (
                    <Badge tone="warning" dot>
                      Unsaved changes
                    </Badge>
                  ) : (
                    <Badge tone="success" dot>
                      Saved
                    </Badge>
                  )
                }
              >
                <CardTitle
                  icon={Bell}
                  title="Notification preferences"
                  subtitle="Choose how the examination cell reaches you."
                />
              </CardHeader>

              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  {
                    key: 'emailNotifications',
                    label: 'Email notifications',
                    description: 'Duty assignments, plan publications and clash alerts.',
                  },
                  {
                    key: 'pushNotifications',
                    label: 'In-app push alerts',
                    description: 'Real-time toasts while you are signed in.',
                  },
                  {
                    key: 'smsNotifications',
                    label: 'SMS reminders',
                    description: 'Text message 2 hours before every duty starts.',
                  },
                  {
                    key: 'weeklyDigest',
                    label: 'Weekly digest',
                    description: 'Monday summary of upcoming exams and unallocated students.',
                  },
                  {
                    key: 'clashAlerts',
                    label: 'Clash detection alerts',
                    description: 'Alert immediately when a plan contains a duplicate student.',
                  },
                  {
                    key: 'autoPublish',
                    label: 'Auto-publish verified plans',
                    description: 'Publish a plan automatically once it passes verification with zero clashes.',
                  },
                ].map((row) => (
                  <div key={row.key} className="flex items-start justify-between gap-6 py-4">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-ink dark:text-white">{row.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{row.description}</p>
                    </div>
                    <Switch
                      label={row.label}
                      checked={Boolean(prefs[row.key])}
                      onChange={(value) => setPrefs({ ...prefs, [row.key]: value })}
                      className="w-[190px] shrink-0"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <Button variant="secondary" onClick={resetPrefs} disabled={saving || !prefsDirty}>
                  Reset to defaults
                </Button>
                <Button leftIcon={Save} loading={saving} disabled={!prefsDirty} onClick={savePrefs}>
                  Save preferences
                </Button>
              </div>
            </Card>
          ) : null}

          {/* ================= institution ================= */}
          {section === 'institution' ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle
                    icon={Database}
                    title="Institution"
                    subtitle="Appears in printed hall plans and report headers."
                  />
                </CardHeader>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Institution name"
                    value={prefs.institution}
                    onChange={(e) => setPrefs({ ...prefs, institution: e.target.value })}
                  />
                  {/* Academic years use a plain ASCII hyphen: the server stores
                      "2025-26", so the en-dash values this form used to offer
                      would never match what it returns. */}
                  <Select
                    label="Academic year"
                    value={prefs.academicYear}
                    onChange={(e) => setPrefs({ ...prefs, academicYear: e.target.value })}
                    options={['2026-27', '2025-26', '2024-25'].map((y) => ({ value: y, label: y }))}
                  />
                  {/* `language` is a free-form string on the wire; the live
                      default is the ISO-ish code "en", so the codes are the
                      values sent. Changing it also switches the UI language
                      immediately through the i18n provider. */}
                  <Select
                    label={t('settings.language')}
                    value={prefs.language}
                    onChange={(e) => {
                      setPrefs({ ...prefs, language: e.target.value });
                      setLanguage(e.target.value);
                    }}
                    options={LANGUAGES.map((lang) => ({ value: lang.code, label: lang.native }))}
                  />
                  <Input
                    label="Academic start date"
                    type="date"
                    value={prefs.academicStartDate ?? ''}
                    onChange={(e) => setPrefs({ ...prefs, academicStartDate: e.target.value || null })}
                    hint="Stored as SettingsRequest.academicStartDate"
                  />
                  <Input
                    label="Daily bulk-upload deadline"
                    type="time"
                    value={prefs.dailyUploadDeadline ?? ''}
                    onChange={(e) => setPrefs({ ...prefs, dailyUploadDeadline: e.target.value || null })}
                    hint="Uploads after this time are flagged in the admin dashboard."
                  />
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <Button variant="secondary" onClick={resetPrefs} disabled={saving || !prefsDirty}>
                    Reset to saved values
                  </Button>
                  <Button leftIcon={Save} loading={saving} disabled={!prefsDirty} onClick={savePrefs}>
                    Save preferences
                  </Button>
                </div>
              </Card>

              <Card>
                <CardHeader
                  action={
                    <Button variant="secondary" size="sm" leftIcon={RefreshCw} loading={saving} onClick={handleRefresh}>
                      Reload data
                    </Button>
                  }
                >
                  <CardTitle icon={Server} title="Mock data store" subtitle="Switch to the real API any time" />
                </CardHeader>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Students', value: students.length },
                    { label: 'Halls', value: halls.length },
                    { label: 'Exams', value: exams.length },
                    { label: 'Faculty', value: faculty.length },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
                    >
                      <p className="font-display text-xl font-extrabold text-ink dark:text-white">{row.value}</p>
                      <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted">{row.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-[12.5px] leading-relaxed text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    The UI currently runs against the in-memory mock database (
                    <strong>{plans.length} seating plans</strong>). Set{' '}
                    <code className="rounded bg-sky-100 px-1 py-0.5 font-mono text-[11px] dark:bg-sky-500/20">
                      VITE_USE_MOCKS=false
                    </code>{' '}
                    in <code className="font-mono text-[11px]">.env</code> to point it at the Spring Boot{' '}
                    <code className="font-mono text-[11px]">/api</code> controllers instead.
                  </p>
                </div>

                <p className="mt-3 text-[11px] text-muted">
                  Data reset requested on {formatDate(new Date())}.
                </p>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}

export { Settings };
