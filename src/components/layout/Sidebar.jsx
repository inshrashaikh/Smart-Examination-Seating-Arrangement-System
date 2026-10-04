import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Building2, CalendarDays, Sparkles, Grid3x3, FileBarChart,
  UserCog, Settings, LogOut, X, ChevronLeft, Bell, ShieldCheck, BarChart3, History,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useI18n } from '../../i18n/index.jsx';
import Logo from '../ui/Logo';
import { Avatar } from '../ui/Badge';
import Button from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import cn from '../../utils/cn';

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', tkey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: 'Students', tkey: 'nav.students', icon: Users, badgeKey: 'students' },
  { to: '/admin/halls', label: 'Halls & Rooms', tkey: 'nav.halls', icon: Building2, badgeKey: 'halls' },
  { to: '/admin/exams', label: 'Exams', tkey: 'nav.exams', icon: CalendarDays, badgeKey: 'exams' },
  { to: '/admin/generate', label: 'Generate Seating', tkey: 'nav.generate', icon: Sparkles, highlight: true },
  { to: '/admin/hall-plan', label: 'Hall Plan Viewer', tkey: 'nav.hallPlan', icon: Grid3x3, badgeKey: 'plans' },
  { to: '/admin/reports', label: 'Reports', tkey: 'nav.reports', icon: FileBarChart },
  { to: '/admin/analytics', label: 'Analytics', tkey: 'nav.analytics', icon: BarChart3 },
  { to: '/admin/audit', label: 'Audit Trail', tkey: 'nav.audit', icon: History },
  { to: '/admin/faculty', label: 'Faculty Management', tkey: 'nav.faculty', icon: UserCog, badgeKey: 'faculty' },
  { to: '/admin/settings', label: 'Settings', tkey: 'nav.settings', icon: Settings },
];

const FACULTY_NAV = [
  { to: '/faculty', label: 'Dashboard', tkey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/faculty/duties', label: 'My Duties', tkey: 'nav.myDuties', icon: CalendarDays, badgeKey: 'duties' },
  { to: '/faculty/hall-plan', label: 'Hall Plan', tkey: 'nav.myHallPlan', icon: Grid3x3 },
  { to: '/faculty/attendance', label: 'Attendance Sheet', tkey: 'nav.attendance', icon: ShieldCheck },
  { to: '/faculty/notifications', label: 'Notifications', tkey: 'nav.notifications', icon: Bell },
  { to: '/faculty/profile', label: 'Profile', tkey: 'nav.profile', icon: Settings },
];

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const { user, logout, isAdmin } = useAuth();
  const { students, halls, exams, faculty, plans } = useData();
  const { t } = useI18n();
  const location = useLocation();

  const nav = isAdmin ? ADMIN_NAV : FACULTY_NAV;
  const badges = {
    students: students.length,
    halls: halls.length,
    exams: exams.length,
    faculty: faculty.length,
    plans: plans.length,
    duties: undefined,
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />
        ) : null}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white/85 backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/80',
          open ? 'translate-x-0 shadow-soft-lg' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'lg:w-[76px]' : 'lg:w-[268px]',
          'w-[278px]'
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'flex h-[68px] shrink-0 items-center border-b border-slate-100 px-4 dark:border-slate-800',
            collapsed && 'lg:justify-center lg:px-2'
          )}
        >
          <Logo to={isAdmin ? '/admin' : '/faculty'} size="sm" showText={!collapsed} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <p
            className={cn(
              'mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400',
              collapsed && 'lg:text-center lg:text-[9px]'
            )}
          >
            {collapsed ? '•••' : isAdmin ? t('nav.examinationCell') : t('nav.invigilatorPortal')}
          </p>
          <ul className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const isActive = item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              const badge = item.badgeKey ? badges[item.badgeKey] : null;

              const link = (
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
                    collapsed && 'lg:justify-center lg:px-2',
                    isActive
                      ? 'text-primary-700 dark:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-ink dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="sidebar-active"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className={cn(
                        'absolute inset-0 rounded-xl',
                        item.highlight
                          ? 'bg-gradient-to-r from-primary-600 to-accent-600 shadow-glow'
                          : 'bg-primary-50 dark:bg-primary-500/15'
                      )}
                    />
                  ) : null}

                  <span className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110',
                        isActive && item.highlight ? 'text-white' : ''
                      )}
                    />
                    {!collapsed ? <span className="truncate">{t(item.tkey)}</span> : null}
                  </span>

                  {!collapsed && badge ? (
                    <span
                      className={cn(
                        'relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                        isActive && item.highlight
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700/70 dark:text-slate-300'
                      )}
                    >
                      {badge}
                    </span>
                  ) : null}

                  {collapsed ? (
                    <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 lg:block">
                      {t(item.tkey)}
                    </span>
                  ) : null}
                </NavLink>
              );

              return (
                <li key={item.to}>
                  {collapsed ? (
                    <Tooltip content={item.label} side="right" className="hidden lg:inline-flex">
                      <span className="w-full">{link}</span>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>

          {!collapsed ? (
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 p-4 text-white shadow-glow">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                Clash-free guarantee
              </p>
              <p className="mt-1 text-2xl font-extrabold leading-none">0</p>
              <p className="mt-1 text-[11px] leading-snug text-white/85">
                adjacency violations detected across every published plan this term.
              </p>
            </div>
          ) : null}
        </nav>

        {/* User */}
        <div
          className={cn(
            'shrink-0 border-t border-slate-100 p-3 dark:border-slate-800',
            collapsed && 'lg:px-2'
          )}
        >
          <div className={cn('flex items-center gap-3 rounded-xl p-2', collapsed && 'lg:justify-center lg:p-0')}>
            <Avatar name={user?.name} photo={user?.photo} department={user?.department} size={38} />
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink dark:text-white">{user?.name}</p>
                <p className="truncate text-[11px] text-muted">{user?.title ?? user?.role}</p>
              </div>
            ) : null}
            {!collapsed ? (
              <Tooltip content={t('nav.signOut')} side="top">
                <button
                  type="button"
                  onClick={logout}
                  aria-label={t('nav.signOut')}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </Tooltip>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={cn('mt-2 w-full', collapsed && 'hidden lg:flex')}
            leftIcon={ChevronLeft}
            onClick={onToggleCollapse}
          >
            {t('nav.collapse')}
          </Button>
        </div>
      </aside>
    </>
  );
}

export { Sidebar };
