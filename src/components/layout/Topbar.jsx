import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu, Search, Sun, Moon, Bell, ChevronDown, LogOut, User, Settings as SettingsIcon,
  CalendarDays, Users, Building2, CheckCheck, Command,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { notificationService } from '../../services';
import { Avatar } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { Spinner } from '../ui/Spinner';
import { relativeTime } from '../../utils/format';
import cn from '../../utils/cn';

const ROLE_LABEL = { ADMIN: 'Examination Cell', FACULTY: 'Invigilator' };

export default function Topbar({ onOpenSidebar, title, subtitle }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAdmin } = useAuth();
  const { students, exams, halls } = useData();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [menu, setMenu] = useState(null); // 'user' | 'notifications'
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const searchRef = useRef(null);
  const wrapperRef = useRef(null);

  /**
   * Bell contents, from `GET /api/notifications`.
   *
   * No `?email=`: the backend derives identity from the JWT, and `/api/notifications/**`
   * is open to both roles, so the admin and faculty bells need different wiring
   * only in where they link to, not in how they fetch.
   *
   * Failures are swallowed deliberately — a broken bell must not throw a toast
   * over whatever the user was actually doing. The dropdown shows an empty state.
   */
  useEffect(() => {
    let cancelled = false;
    notificationService
      .getAll()
      .then((rows) => !cancelled && setNotifications(Array.isArray(rows) ? rows : []))
      .catch(() => !cancelled && setNotifications([]))
      .finally(() => !cancelled && setLoadingNotifs(false));
    return () => {
      cancelled = true;
    };
  }, []);

  /** Marks everything read server-side, then repaints from that same source. */
  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationService.markAllRead();
    } catch {
      // Re-sync on failure so the bell never shows state the server rejected.
      notificationService
        .getAll()
        .then((rows) => setNotifications(Array.isArray(rows) ? rows : []))
        .catch(() => {});
    }
  };

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setShowResults(false);
        setMenu(null);
      }
    };
    const onClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowResults(false);
        setMenu(null);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const results = query.trim()
    ? {
        students: students
          .filter((s) =>
            `${s.name} ${s.rollNo}`.toLowerCase().includes(query.trim().toLowerCase())
          )
          .slice(0, 4),
        exams: exams.filter((e) => e.title.toLowerCase().includes(query.toLowerCase())).slice(0, 3),
        halls: halls.filter((h) => h.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3),
      }
    : { students: [], exams: [], halls: [] };

  const hasResults = results.students.length || results.exams.length || results.halls.length;

  const go = (path) => {
    setQuery('');
    setShowResults(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-surface-dark/80 no-print">
      <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-bold text-ink dark:text-white">{title}</p>
          {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
        </div>

        {/* Global search */}
        <div ref={wrapperRef} className="relative ml-auto w-full max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search students, exams, halls…"
            aria-label="Global search"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-16 text-sm text-ink placeholder:text-slate-400 transition focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-primary-500"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400 sm:inline-flex dark:border-slate-600 dark:bg-slate-900">
            <Command className="h-2.5 w-2.5" />K
          </span>

          <AnimatePresence>
            {showResults && query.trim() ? (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto scrollbar-thin rounded-2xl border border-slate-200 bg-white p-2 shadow-soft-lg dark:border-slate-700 dark:bg-slate-900"
              >
                {hasResults ? (
                  <>
                    {results.students.length ? (
                      <ResultGroup title="Students" icon={Users}>
                        {results.students.map((s) => (
                          <ResultItem
                            key={s.id}
                            onClick={() => go(isAdmin ? `/admin/students?q=${s.rollNo}` : '/faculty/attendance')}
                            title={s.name}
                            meta={`${s.rollNo} · ${s.department}`}
                          />
                        ))}
                      </ResultGroup>
                    ) : null}
                    {results.exams.length ? (
                      <ResultGroup title="Exams" icon={CalendarDays}>
                        {results.exams.map((e) => (
                          <ResultItem
                            key={e.id}
                            onClick={() => go(isAdmin ? '/admin/generate' : '/faculty/duties')}
                            title={e.title}
                            meta={`${e.code} · ${e.date}`}
                          />
                        ))}
                      </ResultGroup>
                    ) : null}
                    {results.halls.length ? (
                      <ResultGroup title="Halls" icon={Building2}>
                        {results.halls.map((h) => (
                          <ResultItem
                            key={h.id}
                            onClick={() => go(isAdmin ? '/admin/hall-plan' : '/faculty/hall-plan')}
                            title={h.name}
                            meta={`${h.capacity} seats · ${h.type}`}
                          />
                        ))}
                      </ResultGroup>
                    ) : null}
                  </>
                ) : (
                  <p className="px-3 py-6 text-center text-sm text-muted">
                    No matches for “{query}”
                  </p>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Theme */}
          <Tooltip content={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                  transition={{ duration: 0.22 }}
                >
                  {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </Tooltip>

          {/* Notifications */}
          <div className="relative">
            <Tooltip content="Notifications">
              <button
                type="button"
                onClick={() => setMenu(menu === 'notifications' ? null : 'notifications')}
                aria-label="Notifications"
                className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <Bell className="h-[18px] w-[18px]" />
                {unread > 0 ? (
                  <motion.span
                    key={unread}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-surface-dark"
                  >
                    {unread}
                  </motion.span>
                ) : null}
              </button>
            </Tooltip>

            <AnimatePresence>
              {menu === 'notifications' ? (
                <Dropdown onClose={() => setMenu(null)} width="w-[22rem]">
                  <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-slate-800">
                    <p className="text-sm font-bold text-ink dark:text-white">Notifications</p>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      disabled={!notifications.some((n) => !n.read)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:underline disabled:opacity-40 disabled:hover:no-underline dark:text-primary-300"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    {loadingNotifs ? (
                      <div className="flex items-center justify-center gap-2 p-8 text-muted">
                        <Spinner size={16} /> Loading…
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="p-8 text-center text-sm text-muted">You're all caught up.</p>
                    ) : (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          to={n.href ?? '#'}
                          onClick={() => {
                            // Read state lives on the server, so a click has to
                            // confirm it — otherwise the badge comes back on the
                            // next page load.
                            if (!n.read) {
                              notificationService.markRead(n.id).catch(() => {});
                              setNotifications((prev) =>
                                prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
                              );
                            }
                            setMenu(null);
                          }}
                          className={cn(
                            'block border-b border-slate-50 p-3 transition hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-white/5',
                            !n.read && 'bg-primary-50/40 dark:bg-primary-500/5'
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {!n.read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" /> : null}
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-ink dark:text-white">{n.title}</p>
                              {/* The backend field is `message`, and it also
                                  carries `createdAt` alongside `at`. */}
                              <p className="mt-0.5 text-xs leading-snug text-muted">{n.message}</p>
                              <p className="mt-1 text-[10px] font-medium text-slate-400">
                                {relativeTime(n.at ?? n.createdAt)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </Dropdown>
              ) : null}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="relative ml-1 border-l border-slate-200 pl-1 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMenu(menu === 'user' ? null : 'user')}
              className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-white/10"
              aria-label="Account menu"
            >
              <Avatar name={user?.name} photo={user?.photo} department={user?.department} size={34} />
              <span className="hidden text-left sm:block">
                <span className="block max-w-[110px] truncate text-[13px] font-bold text-ink dark:text-white">
                  {user?.name}
                </span>
                <span className="block text-[10px] font-medium text-muted">
                  {ROLE_LABEL[user?.role] ?? user?.role}
                </span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>

            <AnimatePresence>
              {menu === 'user' ? (
                <Dropdown onClose={() => setMenu(null)} width="w-64">
                  <div className="border-b border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Avatar name={user?.name} photo={user?.photo} size={42} department={user?.department} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink dark:text-white">{user?.name}</p>
                        <p className="truncate text-[11px] text-muted">{user?.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary-50 px-2.5 py-1.5 text-[11px] font-semibold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                      {ROLE_LABEL[user?.role]} · {user?.department}
                    </div>
                  </div>
                  <div className="p-1.5">
                    <Link
                      to={isAdmin ? '/admin/settings' : '/faculty/profile'}
                      onClick={() => setMenu(null)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                    >
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <Link
                      to={isAdmin ? '/admin/settings' : '/faculty/notifications'}
                      onClick={() => setMenu(null)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                    >
                      <SettingsIcon className="h-4 w-4" /> Preferences
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </Dropdown>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

function Dropdown({ children, width, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
      className={cn(
        'absolute right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft-lg dark:border-slate-700 dark:bg-slate-900',
        width
      )}
    >
      {children}
    </motion.div>
  );
}

function ResultGroup({ title, icon: Icon, children }) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <Icon className="h-3 w-3" /> {title}
      </p>
      {children}
    </div>
  );
}

function ResultItem({ title, meta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-white/5"
    >
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-ink dark:text-white">{title}</span>
        <span className="block truncate text-[11px] text-muted">{meta}</span>
      </span>
    </button>
  );
}

export { Topbar };
