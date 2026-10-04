import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarClock, Building2, Users, User, ShieldCheck, Grid3x3, ArrowRight, Clock,
  MapPin, CheckCircle2, Bell, Sparkles, ClipboardList, Sun, AlertTriangle, RefreshCw,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { DeptBadge, StatusBadge, Avatar } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton, SkeletonCard, SkeletonChart } from '../../components/ui/Skeleton';
import { ProgressBar } from '../../components/ui/Progress';
import { DutyTrendChart, WorkloadDonut } from '../../components/charts/Charts';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { dashboardService } from '../../services';
import useFetch from '../../hooks/useFetch';
import { formatDate, formatTimeRange, relativeTime, isToday } from '../../utils/format';
import cn from '../../utils/cn';

/**
 * Invigilator home â€” today's duty hero, upcoming roster, workload split
 * and the personal duty trend.
 */
export default function FacultyDashboard() {
  const { user } = useAuth();
  const { plans } = useData();

  /**
   * `GET /api/dashboard/faculty` â€” the signed-in member's whole home screen in
   * one round trip. `?email=` is not sent because the backend derives identity
   * from the JWT, which is both simpler and one less place for the client to be
   * wrong.
   *
   * Response shape:
   *   faculty    â†’ the FacultyResponse record
   *   stats      â†’ { upcomingDuties, completedDuties, studentsInvigilated, hallsCovered }
   *   todayDuty  â†’ DutyResponse | null   (null when nothing is on today)
   *   nextDuty   â†’ DutyResponse | null
   *   upcoming   â†’ [DutyResponse]
   *   dutyTrend  â†’ [ { month, duties } ]   (6 buckets, trailing months)
   *   workload   â†’ [ { name, value, color } ]
   *   notifications â†’ [NotificationResponse] â€” the same list `/api/notifications`
   *                    returns, so the bell needs no second request.
   */
  const { data, loading, error, refetch } = useFetch(
    () => dashboardService.getFacultyStats(),
    []
  );

  const stats = data?.stats ?? {};
  const todayDuty = data?.todayDuty ?? null;
  const nextDuty = data?.nextDuty ?? null;
  const upcoming = data?.upcoming ?? [];
  const notifications = data?.notifications ?? [];

  const myPlan = useMemo(() => {
    if (!todayDuty) return null;
    return (
      plans.find((p) => p.examId === todayDuty.examId && p.hallId === todayDuty.hallId) ?? null
    );
  }, [plans, todayDuty]);

  /**
   * Share of assigned duties already completed. Guarded against a zero
   * denominator â€” a brand-new invigilator with no duties at all reads 0%, not
   * NaN â€” and the old inverted numerator (upcoming over total) is corrected
   * here: completed is what the "Duty completion" ring is meant to show.
   */
  const dutyCompletion = useMemo(() => {
    const done = stats.completedDuties ?? 0;
    const total = done + (stats.upcomingDuties ?? 0);
    return total ? Math.round((done / total) * 100) : 0;
  }, [stats.completedDuties, stats.upcomingDuties]);

  return (
    <DashboardLayout title="Dashboard" subtitle="Invigilator Portal">
      <PageHeader
        eyebrow="Invigilator portal"
        icon={CalendarClock}
        title={`Good ${greeting()}, ${user?.name?.replace(/^(Dr\.|Prof\.)\s*/, '') ?? 'there'}`}
        subtitle={
          todayDuty
            ? `You are on duty today in ${todayDuty.hallName}. Report 15 minutes before the paper starts.`
            : nextDuty
              ? `No duty today. Next: ${nextDuty.examTitle} in ${nextDuty.hallName}, ${relativeTime(nextDuty.date)}.`
              : 'No duties are assigned to you right now.'
        }
        actions={
          <>
            <Button as={Link} to="/faculty/attendance" variant="secondary" leftIcon={ClipboardList}>
              Attendance
            </Button>
            <Button as={Link} to="/faculty/duties" leftIcon={CalendarClock}>
              My duties
            </Button>
          </>
        }
      />

      {/* ---------------- today's duty hero ---------------- */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'relative mb-5 overflow-hidden rounded-2xl p-6 text-white shadow-soft-lg',
          todayDuty
            ? 'bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500'
            : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900'
        )}
      >
        {/* floating blobs */}
        <motion.span
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-accent-400/25 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              {todayDuty ? <ShieldCheck className="h-7 w-7" /> : <Sun className="h-7 w-7" />}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
                {todayDuty ? 'Today Â· on duty' : 'Today Â· off duty'}
              </p>
              <h2 className="mt-1 truncate font-display text-2xl font-extrabold">
                {todayDuty ? todayDuty.examTitle : 'No invigilation duty today'}
              </h2>
              <p className="mt-1 text-sm text-white/85">
                {todayDuty
                  ? `${formatDate(todayDuty.date, 'long')} Â· ${formatTimeRange(todayDuty.startTime, todayDuty.endTime)}`
                  : nextDuty
                    ? `Next duty ${formatDate(nextDuty.date)} at ${formatTimeRange(nextDuty.startTime, nextDuty.endTime)}`
                    : 'Enjoy the break â€” the cell has not scheduled you yet.'}
              </p>

              {todayDuty ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge tone="white" className="!bg-white/20 !text-white !ring-white/25">
                    <Building2 className="h-3 w-3" /> {todayDuty.hallName}
                  </Badge>
                  <Badge tone="white" className="!bg-white/20 !text-white !ring-white/25">
                    {todayDuty.role.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                  <Badge tone="white" className="!bg-white/20 !text-white !ring-white/25">
                    <Users className="h-3 w-3" /> {myPlan?.stats.allocated ?? todayDuty.seatCount ?? 0} candidates
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>

          {todayDuty ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                as={Link}
                to="/faculty/hall-plan"
                variant="white"
                leftIcon={Grid3x3}
              >
                Open hall plan
              </Button>
              <Button
                as={Link}
                to="/faculty/attendance"
                variant="white"
                leftIcon={ClipboardList}
                className="!bg-white/10 !text-white !ring-1 !ring-white/25 hover:!bg-white/20"
              >
                Take attendance
              </Button>
            </div>
          ) : (
            <Button as={Link} to="/faculty/duties" variant="white" rightIcon={ArrowRight}>
              View my duties
            </Button>
          )}
        </div>
      </motion.div>

      {/* ---------------- fetch failure ---------------- */}
      {error ? (
        <Card className="mt-5 border-rose-200 dark:border-rose-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="text-[13.5px] font-bold text-ink dark:text-white">
                  Could not load your dashboard
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

      {/* ---------------- stats ---------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              index={0}
              label="Upcoming duties"
              value={stats.upcomingDuties ?? 0}
              icon={CalendarClock}
              tone="primary"
              hint="Assigned, not yet completed"
            />
            <StatCard
              index={1}
              label="Completed duties"
              value={stats.completedDuties ?? 0}
              icon={CheckCircle2}
              tone="emerald"
              hint="This academic term"
            />
            <StatCard
              index={2}
              label="Students invigilated"
              value={stats.studentsInvigilated ?? 0}
              icon={Users}
              tone="violet"
              hint={`${stats.hallsCovered ?? 0} halls covered`}
            />
            <StatCard
              index={3}
              label="Duty completion"
              value={dutyCompletion}
              suffix="%"
              icon={ShieldCheck}
              tone="accent"
              bars={[2, 4, 3, 5, 4, (data?.dutyTrend ?? []).length ? data.dutyTrend.at(-1)?.duties : 3]}
              hint="Share of assigned duties done"
            />
          </>
        )}
      </div>

      {/* ---------------- upcoming + charts ---------------- */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            action={
              <Button as={Link} to="/faculty/duties" size="sm" variant="ghost" rightIcon={ArrowRight}>
                All duties
              </Button>
            }
          >
            <CardTitle
              icon={CalendarClock}
              title="Upcoming duties"
              subtitle="Your next invigilation assignments"
            />
          </CardHeader>

          <div className="mt-4 space-y-2.5">
            {loading && !data ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[74px] w-full rounded-xl" />)
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No upcoming duties"
                description="The examination cell has not assigned you a duty yet."
                compact
              />
            ) : (
              upcoming.map((duty, index) => (
                <motion.div
                  key={duty.id}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.35 }}
                  className={cn(
                    'flex flex-wrap items-center gap-3 rounded-xl border p-3.5 transition',
                    isToday(duty.date)
                      ? 'border-primary-300 bg-primary-50/60 dark:border-primary-500/40 dark:bg-primary-500/10'
                      : 'border-slate-200/80 hover:border-primary-300 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900/40'
                  )}
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-center dark:bg-primary-500/15">
                    <span className="block text-[15px] font-extrabold leading-none text-primary-600 dark:text-primary-300">
                      {new Date(duty.date).getDate()}
                    </span>
                    <span className="block text-[9px] font-bold uppercase text-primary-500/70">
                      {new Date(duty.date).toLocaleString('en-IN', { month: 'short' })}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink dark:text-white">{duty.examTitle}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 truncate text-[11.5px] text-muted">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {duty.hallName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeRange(duty.startTime, duty.endTime)}
                      </span>
                      <span>{duty.seatCount} candidates</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge status={duty.role} size="sm" />
                    <span className="text-[10.5px] font-semibold text-muted">{relativeTime(duty.date)}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle icon={Sparkles} title="Duty trend" subtitle="Last six months" />
            </CardHeader>
            <div className="mt-4">
              {loading && !data ? (
                <SkeletonChart className="border-0 shadow-none p-0 dark:bg-transparent" />
              ) : (
                <DutyTrendChart data={data?.dutyTrend ?? []} />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={Users} title="Workload by department" subtitle="Duties covering each department" />
            </CardHeader>
            <div className="mt-4">
              {loading && !data ? (
                <div className="skeleton h-[200px] w-full rounded-xl" />
              ) : (
                <>
                  <WorkloadDonut data={data?.workload ?? []} height={180} />
                  <ul className="mt-3 space-y-1.5">
                    {(data?.workload ?? [])
                      .filter((w) => w.value > 0)
                      .map((w) => (
                        <li key={w.name} className="flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: w.color }} />
                          <DeptBadge code={w.name} size="sm" />
                          <span className="ml-auto text-[12px] font-bold text-muted">{w.value} duties</span>
                        </li>
                      ))}
                    {(data?.workload ?? []).every((w) => w.value === 0) ? (
                      <li className="text-[12px] text-muted">No department-wise duties recorded yet.</li>
                    ) : null}
                  </ul>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ---------------- notifications + profile ---------------- */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            action={
              <Button as={Link} to="/faculty/notifications" size="sm" variant="ghost" rightIcon={ArrowRight}>
                Inbox
              </Button>
            }
          >
            <CardTitle icon={Bell} title="Recent notifications" subtitle="Duty and plan updates" />
          </CardHeader>
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.slice(0, 4).map((note) => (
              <li key={note.id} className="flex items-start gap-3 py-3.5">
                <span
                  className={cn(
                    'mt-1 h-2 w-2 shrink-0 rounded-full',
                    note.read ? 'bg-slate-300 dark:bg-slate-700' : 'bg-primary-500'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-ink dark:text-white">{note.title}</p>
                  <p className="text-xs leading-relaxed text-muted">{note.message}</p>
                </div>
                <span className="shrink-0 text-[10.5px] font-medium text-slate-400">
                  {relativeTime(note.at ?? note.createdAt)}
                </span>
              </li>
            ))}
            {notifications.length === 0 ? (
              <li className="py-6 text-center text-sm text-muted">You are all caught up.</li>
            ) : null}
          </ul>
        </Card>

        <Card>
          <CardHeader
            action={
              <Button as={Link} to="/faculty/profile" size="sm" variant="ghost" rightIcon={ArrowRight}>
                Edit
              </Button>
            }
          >
            <CardTitle icon={User} title="My profile" subtitle="Your invigilator credentials" />
          </CardHeader>

          <div className="mt-4 flex items-center gap-4">
            <Avatar name={user?.name} photo={user?.photo} department={user?.department} size={56} />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink dark:text-white">{user?.name}</p>
              <p className="truncate text-[12px] text-muted">{user?.title ?? 'Faculty'}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {user?.department ? <DeptBadge code={user.department} size="sm" /> : null}
                <Badge tone="slate" size="sm">
                  {user?.employeeId ?? 'â€”'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted">Duties completed</span>
              <span className="font-bold text-ink dark:text-slate-100">{stats.completedDuties ?? 0}</span>
            </div>
            <ProgressBar
              value={dutyCompletion}
              tone="emerald"
              showLabel
              label="Term completion"
            />
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-muted">Halls covered</span>
              <span className="font-bold text-ink dark:text-slate-100">{stats.hallsCovered ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export { FacultyDashboard };
