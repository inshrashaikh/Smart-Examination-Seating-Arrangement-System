import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, CheckCheck, Filter, ArrowRight, Sparkles, ShieldCheck,
  CalendarClock, Info, AlertTriangle, RefreshCw,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { notificationService } from '../../services';
import useFetch from '../../hooks/useFetch';
import { relativeTime } from '../../utils/format';
import cn from '../../utils/cn';

/**
 * Notification inbox.
 *
 * Backed by `GET /api/notifications` (a bare array) with read state persisted
 * through `PUT /api/notifications/{id}/read` and
 * `PUT /api/notifications/read-all`. Read state is therefore **server** state,
 * not local component state, so it survives a reload — the old version kept it
 * in `useState` and lost it on refresh.
 *
 * `NotificationResponse` carries `message` (not `body`) and both `createdAt` and
 * `at`; `at` is read with a fallback. There is no per-item delete endpoint, so
 * the destructive "clear" affordance is deliberately absent — the honest action
 * is "mark all read".
 *
 * `?email=` is not sent: the backend derives identity from the JWT.
 */
const TYPES = {
  duty: {
    icon: CalendarClock,
    tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    href: '/faculty/duties',
    label: 'Duty',
  },
  plan: {
    icon: ShieldCheck,
    tone: 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
    href: '/faculty/hall-plan',
    label: 'Plan',
  },
  exam: {
    icon: Sparkles,
    tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    href: '/faculty/duties',
    label: 'Exam',
  },
  result: {
    icon: ShieldCheck,
    tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    href: '/faculty/attendance',
    label: 'Result',
  },
  system: {
    icon: Info,
    tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    href: '/faculty/profile',
    label: 'System',
  },
  alert: {
    icon: AlertTriangle,
    tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    href: '/faculty/duties',
    label: 'Alert',
  },
};

export default function Notifications() {
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  /** Ids with a mark-read request in flight, so each row gets its own spinner. */
  const [marking, setMarking] = useState(() => new Set());

  const { data, loading, error, refetch, setData } = useFetch(
    () => notificationService.getAll(),
    []
  );

  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const unread = items.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'unread') return items.filter((n) => !n.read);
    return items.filter((n) => n.type === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const byType = {};
    items.forEach((n) => {
      byType[n.type] = (byType[n.type] ?? 0) + 1;
    });
    return byType;
  }, [items]);

  /** Optimistically flips one row, then confirms with the server. */
  const markRead = async (id) => {
    if (!id) return;
    setMarking((prev) => new Set(prev).add(id));
    // Paint immediately; the PUT below is the source of truth.
    setData((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationService.markRead(id);
    } catch (err) {
      toast.error(err?.message ?? 'Could not mark the notification as read.');
      refetch();
    } finally {
      setMarking((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const markAllRead = async () => {
    if (!unread) return;
    setData((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    try {
      await notificationService.markAllRead();
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error(err?.message ?? 'Could not mark everything as read.');
      refetch();
    }
  };

  return (
    <DashboardLayout title="Notifications" subtitle="Invigilator Portal">
      <PageHeader
        eyebrow="Inbox"
        icon={Bell}
        title="Notifications"
        subtitle={
          unread
            ? `${unread} unread update${unread > 1 ? 's' : ''} about your duties and hall plans.`
            : 'You are all caught up.'
        }
        breadcrumb={[{ label: 'Invigilator Portal', to: '/faculty' }, { label: 'Notifications' }]}
        actions={
          <>
            <Button variant="ghost" leftIcon={RefreshCw} onClick={refetch} loading={loading}>
              Refresh
            </Button>
            <Button
              variant="secondary"
              leftIcon={CheckCheck}
              disabled={!unread}
              loading={marking.size > 0}
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          </>
        }
      />

      {/* ---------------- filters ---------------- */}
      {items.length ? (
        <div className="mb-5">
          <Tabs
            tabs={[
              { value: 'all', label: 'All', icon: Bell, count: items.length },
              { value: 'unread', label: 'Unread', icon: BellOff, count: unread },
              ...Object.keys(TYPES)
                .filter((type) => counts[type])
                .map((type) => ({
                  value: type,
                  label: TYPES[type].label,
                  icon: TYPES[type].icon,
                  count: counts[type],
                })),
            ]}
            value={filter}
            onChange={setFilter}
            variant="segmented"
            size="sm"
          />
        </div>
      ) : null}

      {/* ---------------- fetch failure ---------------- */}
      {error ? (
        <Card className="mb-5 border-rose-200 dark:border-rose-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="text-[13.5px] font-bold text-ink dark:text-white">
                  Could not load notifications
                </p>
                <p className="text-[12px] text-muted">{error.message}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" leftIcon={RefreshCw} onClick={refetch}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {/* ---------------- list ---------------- */}
      {loading && !items.length ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px] w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={items.length ? Filter : BellOff}
            title={items.length ? 'Nothing in this filter' : 'No notifications yet'}
            description={
              items.length
                ? 'Try a different filter to see the rest of your inbox.'
                : 'Duty assignments, plan publications and exam updates will appear here.'
            }
            action={
              items.length ? (
                <Button variant="secondary" onClick={() => setFilter('all')}>
                  Show all
                </Button>
              ) : (
                <Button as={Link} to="/faculty/duties" leftIcon={ArrowRight}>
                  View my duties
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((note, index) => {
              const meta = TYPES[note.type] ?? TYPES.system;
              const Icon = meta.icon;
              // The backend may supply its own deep link; prefer it.
              const target = note.href ?? meta.href;
              const busy = marking.has(note.id);
              return (
                <motion.li
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.32 }}
                >
                  <Card
                    padded={false}
                    className={cn(
                      'group relative overflow-hidden transition hover:border-primary-300 hover:shadow-soft dark:hover:border-primary-500/40',
                      !note.read && 'border-l-4 border-l-primary-500'
                    )}
                  >
                    <div className="flex items-start gap-4 p-4 sm:p-5">
                      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', meta.tone)}>
                        <Icon className="h-5 w-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              'truncate text-[14px]',
                              note.read
                                ? 'font-semibold text-slate-600 dark:text-slate-300'
                                : 'font-extrabold text-ink dark:text-white'
                            )}
                          >
                            {note.title}
                          </p>
                          {!note.read ? (
                            <Badge tone="primary" size="sm" dot>
                              New
                            </Badge>
                          ) : null}
                          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                            {relativeTime(note.at ?? note.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted">{note.message}</p>
                      </div>

                      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                        {target ? (
                          <Button
                            as={Link}
                            to={target}
                            size="xs"
                            variant="secondary"
                            onClick={() => (note.read ? undefined : markRead(note.id))}
                          >
                            Open
                          </Button>
                        ) : null}
                        {!note.read ? (
                          <button
                            type="button"
                            onClick={() => markRead(note.id)}
                            disabled={busy}
                            aria-label={`Mark "${note.title}" as read`}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 disabled:opacity-50 dark:hover:bg-primary-500/10"
                          >
                            {busy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCheck className="h-4 w-4" />
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {items.length ? (
        <p className="mt-5 text-center text-[11px] text-muted">
          {items.length} notification{items.length === 1 ? '' : 's'} · {unread} unread · read state is stored on
          the server.
        </p>
      ) : null}
    </DashboardLayout>
  );
}

export { Notifications };