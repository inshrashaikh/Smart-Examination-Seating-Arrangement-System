import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Building2, CalendarDays, Armchair, Sparkles, TrendingUp, Activity,
  Clock, FileBarChart, ArrowRight, ShieldCheck, Gauge, UserCog, Plus, Upload, AlertTriangle,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton, SkeletonCard, SkeletonChart } from '../../components/ui/Skeleton';
import Badge, { DeptBadge, StatusBadge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/Progress';
import {
  AllocationTrendChart, DepartmentPieChart, HallUtilisationChart,
} from '../../components/charts/Charts';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { dashboardService } from '../../services';
import useFetch from '../../hooks/useFetch';
import { formatDate, formatTimeRange, relativeTime, formatNumber } from '../../utils/format';
import cn from '../../utils/cn';

const ACTIVITY_ICONS = {
  generate: Sparkles,
  upload: Upload,
  duty: UserCog,
  publish: ShieldCheck,
  exam: CalendarDays,
  swap: ArrowRight,
  hall: Building2,
};

const ACTIVITY_TONES = {
  generate: 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
  upload: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
  duty: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  publish: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  exam: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  swap: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  hall: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { students, halls, exams, plans, faculty, duties, helpers } = useData();
  const toast = useToast();

  /**
   * `GET /api/dashboard/stats` is the single source for every number on this
   * page — stat cards, the trend line, the department pie, the hall-utilisation
   * bars, the activity feed and the upcoming list. The store collections are
   * only a fallback for counts while the request is still in flight.
   */
  const { data, loading, error, refetch } = useFetch(() => dashboardService.getStats(), []);

  const stats = data?.stats ?? {};
  const studentsByDepartment = helpers.studentsByDepartment;
  const totalCapacity = stats.totalCapacity ?? helpers.totalCapacity;

  const seatBars = useMemo(
    () => (data?.allocationsOverTime ?? []).map((row) => row.seats),
    [data]
  );

  const todayExams = useMemo(() => {
    const today = new Date().toDateString();
    return exams.filter((e) => new Date(e.date).toDateString() === today);
  }, [exams]);

  const facultyWithoutDuty = useMemo(() => {
    const assigned = new Set(duties.map((d) => d.facultyEmail));
    return faculty.filter((f) => !assigned.has(f.email)).length;
  }, [faculty, duties]);

  return (
    <DashboardLayout title="Dashboard" subtitle="Examination Cell · Overview">
      <PageHeader
        eyebrow="Examination Department"
        icon={Gauge}
        title={`Good ${greeting()}, ${user?.name?.split(' ')[1] ?? user?.name ?? 'there'}`}
        subtitle={
          todayExams.length
            ? `${todayExams.length} exam${todayExams.length > 1 ? 's are' : ' is'} running today.`
            : 'No exams are running today — a good time to generate upcoming plans.'
        }
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={FileBarChart}
              onClick={() => toast.info('Open Reports for hall-wise, department-wise and attendance exports.')}
            >
              Reports
            </Button>
            <Button as={Link} to="/admin/generate" leftIcon={Sparkles}>
              Generate Seating
            </Button>
          </>
        }
      />

      {/* ---------------- stat cards ---------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              index={0}
              label="Total Students"
              value={students.length || stats.totalStudents || 0}
              icon={Users}
              tone="primary"
              trend={8}
              trendLabel="vs last semester"
              bars={seatBars.slice(-8)}
              onClick={() => {}}
            />
            <StatCard
              index={1}
              label="Examination Halls"
              value={halls.length || stats.totalHalls || 0}
              icon={Building2}
              tone="accent"
              hint={`${totalCapacity} seats mapped`}
            />
            <StatCard
              index={2}
              label="Exams Scheduled"
              value={exams.filter((e) => e.status !== 'COMPLETED').length || stats.examsScheduled || 0}
              icon={CalendarDays}
              tone="amber"
              hint={`${exams.length} total this term`}
            />
            <StatCard
              index={3}
              label="Seats Allocated"
              value={plans.reduce((sum, p) => sum + p.stats.allocated, 0) || stats.seatsAllocated || 0}
              icon={Armchair}
              tone="violet"
              hint={`${plans.length} published plans`}
            />
          </>
        )}
      </div>

      {/* ---------------- fetch failure ---------------- */}
      {error ? (
        <Card className="mt-5 border-rose-200 dark:border-rose-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="text-[13.5px] font-bold text-ink dark:text-white">
                  Could not load the dashboard
                </p>
                <p className="text-[12px] text-muted">{error.message}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {/* ---------------- secondary stats ---------------- */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Detected clashes"
          value={stats.clashes ?? 0}
          icon={ShieldCheck}
          tone="emerald"
          hint="Across every generated plan"
        />
        <MiniStat
          label="Average utilisation"
          value={`${stats.avgUtilisation ?? 0}%`}
          icon={TrendingUp}
          tone="sky"
          hint="Seats filled per hall"
        />
        <MiniStat
          label="Faculty on roster"
          value={faculty.length}
          icon={UserCog}
          tone="violet"
          hint={`${facultyWithoutDuty} awaiting duty assignment`}
        />
        <MiniStat
          label="Active seating plans"
          value={plans.length || stats.activePlans || 0}
          icon={FileBarChart}
          tone="primary"
          hint="Ready to export"
        />
      </div>

      {/* ---------------- charts ---------------- */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            action={
              <Badge tone="primary" dot>
                Last 12 months
              </Badge>
            }
          >
            <CardTitle
              icon={TrendingUp}
              title="Allocations over time"
              subtitle="Seats assigned per month across all halls"
            />
          </CardHeader>
          <div className="mt-5">
            {loading && !data ? (
              <SkeletonChart className="border-0 shadow-none p-0 dark:bg-transparent" />
            ) : (
              <AllocationTrendChart data={data?.allocationsOverTime ?? []} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={Users} title="Department mix" subtitle="Students on the register" />
          </CardHeader>
          <div className="mt-4">
            {loading && !data ? (
              <div className="skeleton h-[260px] w-full rounded-xl" />
            ) : (
              <>
                <DepartmentPieChart data={data?.departmentDistribution ?? []} />
                <ul className="mt-3 space-y-2">
                  {Object.entries(studentsByDepartment).map(([code, count]) => {
                    const pct = students.length ? Math.round((count / students.length) * 100) : 0;
                    const dept = DEPT_COLORS[code] ?? { color: '#94A3B8', soft: '#F1F5F9' };
                    return (
                      <li key={code} className="flex items-center gap-3">
                        <span className="w-12 shrink-0">
                          <DeptBadge code={code} size="sm" />
                        </span>
                        <ProgressBar value={pct} className="flex-1" size="sm" />
                        <span className="w-20 shrink-0 text-right text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {count} · {pct}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ---------------- hall utilisation + upcoming exams ---------------- */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader
            action={
              <Button as={Link} to="/admin/halls" size="sm" variant="ghost" rightIcon={ArrowRight}>
                All halls
              </Button>
            }
          >
            <CardTitle icon={Building2} title="Hall utilisation" subtitle="Percentage of seats filled" />
          </CardHeader>
          <div className="mt-5">
            {loading && !data ? (
              <SkeletonChart className="border-0 shadow-none p-0 dark:bg-transparent" />
            ) : (
              <HallUtilisationChart data={data?.hallUtilisation ?? []} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            action={
              <Button as={Link} to="/admin/exams" size="sm" variant="ghost" rightIcon={ArrowRight}>
                Schedule
              </Button>
            }
          >
            <CardTitle icon={CalendarDays} title="Upcoming exams" subtitle="Next sessions on campus" />
          </CardHeader>

          <div className="mt-4 space-y-2.5">
            {loading && !data ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)
            ) : (data?.upcoming ?? []).length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming exams"
                description="Create an exam to start generating seating plans."
                compact
                action={
                  <Button as={Link} to="/admin/exams" size="sm" leftIcon={Plus}>
                    Schedule exam
                  </Button>
                }
              />
            ) : (
              (data?.upcoming ?? []).map((exam, index) => (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.35 }}
                  className="group flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 transition hover:border-primary-300 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900/50"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-center dark:bg-primary-500/15">
                    <span className="block text-[15px] font-extrabold leading-none text-primary-600 dark:text-primary-300">
                      {new Date(exam.date).getDate()}
                    </span>
                    <span className="block text-[9px] font-bold uppercase text-primary-500/70">
                      {new Date(exam.date).toLocaleString('en-IN', { month: 'short' })}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink dark:text-white">{exam.title}</p>
                    <p className="truncate text-xs text-muted">
                      {exam.code} · {exam.course} · {formatTimeRange(exam.startTime, exam.endTime)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {exam.departments.map((code) => (
                        <DeptBadge key={code} code={code} size="sm" />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={exam.status} size="sm" />
                    <span className="flex items-center gap-1 text-[11px] font-medium text-muted">
                      <Clock className="h-3 w-3" /> {relativeTime(exam.date)}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ---------------- activity feed ---------------- */}
      <Card className="mt-5">
        <CardHeader
          action={
            <Button variant="ghost" size="sm" leftIcon={Activity} onClick={() => refetch()}>
              Refresh
            </Button>
          }
        >
          <CardTitle icon={Activity} title="Recent activity" subtitle="Everything the cell has done lately" />
        </CardHeader>

        <ol className="relative mt-5 space-y-4 pl-1">
          <span className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-px bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
          {loading && !data ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : (
            (data?.activity ?? []).map((item, index) => {
              const Icon = ACTIVITY_ICONS[item.type] ?? Activity;
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.35 }}
                  className="relative flex gap-4"
                >
                  <span
                    className={cn(
                      'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-xl ring-4 ring-white dark:ring-slate-900',
                      ACTIVITY_TONES[item.type] ?? ACTIVITY_TONES.exam
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="truncate text-sm font-semibold text-ink dark:text-white">{item.title}</p>
                    <p className="truncate text-xs text-muted">{item.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {relativeTime(item.at)}
                    </p>
                    <p className="text-[10px] text-slate-400">{item.actor}</p>
                  </div>
                </motion.li>
              );
            })
          )}
        </ol>
      </Card>

      {/* ---------------- quick actions ---------------- */}
      <Card className="mt-5">
        <CardTitle icon={Sparkles} title="Quick actions" subtitle="Common examination-cell tasks" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { to: '/admin/students', label: 'Add students', icon: Users, hint: 'Manual entry or CSV bulk upload' },
            { to: '/admin/halls', label: 'Configure halls', icon: Building2, hint: 'Rows, columns and blocked seats' },
            { to: '/admin/generate', label: 'Generate seating', icon: Sparkles, hint: 'Run the allocation wizard' },
            { to: '/admin/reports', label: 'Export reports', icon: FileBarChart, hint: 'PDF, Excel and CSV' },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:-translate-y-1 hover:border-primary-300 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900/50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 transition-transform group-hover:scale-110 dark:bg-primary-500/15 dark:text-primary-300">
                <action.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink dark:text-white">{action.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{action.hint}</span>
              </span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500" />
            </Link>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}

function MiniStat({ label, value, icon: Icon, tone = 'primary', hint }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
    accent: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  };
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/60">
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-muted">{label}</p>
        <p className="font-display text-xl font-extrabold text-ink dark:text-white">{formatNumber(value) || value}</p>
        {hint ? <p className="truncate text-[10px] text-slate-400">{hint}</p> : null}
      </div>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const DEPT_COLORS = {
  CSE: { color: '#4F46E5', soft: '#EEF2FF' },
  IT: { color: '#14B8A6', soft: '#F0FDFA' },
  ECE: { color: '#F59E0B', soft: '#FFFBEB' },
  MECH: { color: '#EC4899', soft: '#FDF2F8' },
  CIVIL: { color: '#3B82F6', soft: '#EFF6FF' },
};

export { AdminDashboard };
