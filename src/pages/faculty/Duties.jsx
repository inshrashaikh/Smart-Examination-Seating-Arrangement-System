import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock, ChevronLeft, ChevronRight, Clock, MapPin, Users, Building2,
  CheckCircle2, Grid3x3, ArrowRight, Info, CalendarDays, ShieldCheck,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Tabs from '../../components/ui/Tabs';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTimeRange, relativeTime, isToday } from '../../utils/format';
import cn from '../../utils/cn';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * My duties — month calendar with duty markers plus a sortable list and
 * a duty detail sheet.
 */
export default function Duties() {
  const { user } = useAuth();
  const { duties, loadDuties, loading, plans } = useData();
  const toast = useToast();

  const [view, setView] = useState('upcoming');
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(null);

  /**
   * Duties are hydrated once by `DataContext.refreshAll` via
   * `GET /api/duties/my`, which the backend scopes to the signed-in member — so
   * no email is sent and there is nothing role-specific to resolve here. The
   * local `loading` flag only covers this page's own reload path.
   */
  useEffect(() => {
    loadDuties().catch((error) => {
      toast.error(error?.message ?? 'Could not load your duties.');
    });
  }, [loadDuties, toast]);

  /* ---------------------------- derived ---------------------------- */
  const sorted = useMemo(
    () =>
      [...duties].sort((a, b) =>
        `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)
      ),
    [duties]
  );

  const today = new Date();
  const upcoming = sorted.filter((d) => new Date(d.date) >= startOfDay(today) && d.status !== 'COMPLETED');
  const past = sorted.filter((d) => new Date(d.date) < startOfDay(today));
  const todayDuties = sorted.filter((d) => isToday(d.date));

  const rows =
    view === 'upcoming' ? upcoming : view === 'past' ? past.slice().reverse() : sorted;

  const calendar = useMemo(() => buildMonthGrid(cursor, duties), [cursor, duties]);
  const monthDuties = useMemo(
    () =>
      duties.filter((d) => {
        const date = new Date(d.date);
        return (
          date.getFullYear() === cursor.getFullYear() && date.getMonth() === cursor.getMonth()
        );
      }),
    [duties, cursor]
  );

  const seatsThisTerm = duties.reduce((sum, d) => sum + (d.seatCount ?? 0), 0);
  const hallsCovered = new Set(duties.map((d) => d.hallId)).size;

  return (
    <DashboardLayout title="My Duties" subtitle="Invigilator Portal">
      <PageHeader
        eyebrow="Invigilation"
        icon={CalendarClock}
        title="My duties"
        subtitle="Every assignment the examination cell has given you, with hall, timings and role."
        breadcrumb={[{ label: 'Invigilator Portal', to: '/faculty' }, { label: 'My Duties' }]}
        actions={
          <Button as={Link} to="/faculty/hall-plan" variant="secondary" leftIcon={Grid3x3}>
            Hall plan
          </Button>
        }
      />

      {/* ---------------- stats ---------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Upcoming duties"
          value={upcoming.length}
          icon={CalendarClock}
          tone="primary"
          hint={todayDuties.length ? `${todayDuties.length} of them today` : 'None today'}
        />
        <StatCard index={1} label="Completed" value={past.length} icon={CheckCircle2} tone="emerald" hint="Past assignments" />
        <StatCard index={2} label="Candidates covered" value={seatsThisTerm} icon={Users} tone="violet" hint="Across all duties" />
        <StatCard index={3} label="Halls covered" value={hallsCovered} icon={Building2} tone="accent" hint="Distinct venues" />
      </div>

      {/* ---------------- calendar ---------------- */}
      <Card className="mt-5">
        <CardHeader
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={ChevronLeft}
                aria-label="Previous month"
                onClick={() => setCursor((c) => addMonths(c, -1))}
              >
                <span className="sr-only sm:not-sr-only">Prev</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
                Today
              </Button>
              <Button
                variant="secondary"
                size="sm"
                rightIcon={ChevronRight}
                aria-label="Next month"
                onClick={() => setCursor((c) => addMonths(c, 1))}
              >
                <span className="sr-only sm:not-sr-only">Next</span>
              </Button>
            </div>
          }
        >
          <CardTitle
            icon={CalendarDays}
            title={cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            subtitle={`${monthDuties.length} duty${monthDuties.length === 1 ? '' : 'ies'} this month`}
          />
        </CardHeader>

        <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400"
            >
              {day}
            </div>
          ))}

          {calendar.map((cell, index) => (
            <motion.button
              key={cell.key}
              type="button"
              disabled={!cell.inMonth}
              onClick={() => cell.duties.length && setSelected(cell)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(index * 0.012, 0.3), duration: 0.2 }}
              className={cn(
                'relative aspect-square rounded-xl border p-1 text-left transition',
                cell.isToday
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary/25 dark:border-primary-400 dark:bg-primary-500/15'
                  : cell.duties.length
                    ? 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900/50'
                    : 'border-slate-100 dark:border-slate-800/70',
                !cell.inMonth && 'opacity-35'
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-bold',
                  cell.isToday ? 'text-primary-700 dark:text-primary-200' : 'text-slate-600 dark:text-slate-300'
                )}
              >
                {cell.day}
              </span>

              {cell.duties.length ? (
                <div className="mt-1 space-y-0.5">
                  {cell.duties.slice(0, 3).map((duty) => (
                    <span
                      key={duty.id}
                      className={cn(
                        'block truncate rounded px-1 py-0.5 text-[8.5px] font-bold leading-tight',
                        duty.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          : duty.role === 'CHIEF_INVIGILATOR'
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                            : 'bg-primary-100 text-primary-700 dark:bg-primary-500/25 dark:text-primary-200'
                      )}
                    >
                      {duty.hallCode ?? duty.hallName?.split(' ').pop()}
                    </span>
                  ))}
                  {cell.duties.length > 3 ? (
                    <span className="block text-[8px] font-bold text-muted">+{cell.duties.length - 3}</span>
                  ) : null}
                </div>
              ) : null}
            </motion.button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-[11px] dark:border-slate-800">
          {[
            { label: 'Chief invigilator', cls: 'bg-violet-100 dark:bg-violet-500/25' },
            { label: 'Invigilator', cls: 'bg-primary-100 dark:bg-primary-500/25' },
            { label: 'Completed', cls: 'bg-slate-100 dark:bg-slate-800' },
          ].map((legend) => (
            <span key={legend.label} className="flex items-center gap-1.5 text-muted">
              <span className={cn('h-2.5 w-2.5 rounded', legend.cls)} />
              {legend.label}
            </span>
          ))}
        </div>
      </Card>

      {/* ---------------- duty list ---------------- */}
      <div className="mt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            tabs={[
              { value: 'upcoming', label: 'Upcoming', icon: CalendarClock, count: upcoming.length },
              { value: 'past', label: 'Completed', icon: CheckCircle2, count: past.length },
              { value: 'all', label: 'All', icon: Info, count: duties.length },
            ]}
            value={view}
            onChange={setView}
            variant="segmented"
            size="sm"
          />
          {rows.length ? (
            <p className="text-[12px] font-semibold text-muted">
              {rows.length} duty{rows.length === 1 ? '' : 'ies'} · {seatsThisTerm} candidates
            </p>
          ) : null}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24 }}
          >
            <DutyTable rows={rows} loading={loading} plans={plans} onOpen={setSelected} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ---------------- detail modal ---------------- */}
      <DutyDetail
        duty={selected}
        plans={plans}
        onClose={() => setSelected(null)}
      />
    </DashboardLayout>
  );
}

/* ------------------------------------------------------------------ *
 * Table
 * ------------------------------------------------------------------ */
function DutyTable({ rows, loading, onOpen }) {
  const columns = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink dark:text-white">
            {formatDate(row.date)}
            {isToday(row.date) ? (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                Today
              </span>
            ) : null}
          </p>
          <p className="text-[11px] text-muted">{relativeTime(row.date)}</p>
        </div>
      ),
    },
    {
      key: 'examTitle',
      header: 'Exam',
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-ink dark:text-white">{row.examTitle}</p>
          <p className="truncate font-mono text-[11px] text-muted">{row.examCode}</p>
        </div>
      ),
    },
    {
      key: 'hallName',
      header: 'Hall',
      sortable: true,
      render: (row) => (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          {row.hallName}
        </span>
      ),
    },
    {
      key: 'timing',
      header: 'Timing',
      sortable: false,
      render: (row) => (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-muted">
          <Clock className="h-3.5 w-3.5" />
          {formatTimeRange(row.startTime, row.endTime)}
        </span>
      ),
    },
    { key: 'seatCount', header: 'Candidates', sortable: true, align: 'center' },
    { key: 'role', header: 'Role', sortable: true, render: (row) => <StatusBadge status={row.role} size="sm" /> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} size="sm" /> },
  ];

  return (
    <Table
      columns={columns}
      rows={rows}
      loading={loading && rows.length === 0}
      pageSize={10}
      rowKey={(row) => row.id}
      onRowClick={onOpen}
      initialSort={{ key: 'date', dir: 'asc' }}
      searchPlaceholder="Search duty by exam, hall or role…"
      emptyIcon={CalendarClock}
      emptyTitle="No duties in this view"
      emptyDescription="Switch tabs or check back once the examination cell assigns your next duty."
      emptyAction={
        <Button as={Link} to="/faculty" size="sm" leftIcon={ArrowRight}>
          Back to dashboard
        </Button>
      }
    />
  );
}

/* ------------------------------------------------------------------ *
 * Detail modal
 * ------------------------------------------------------------------ */
function DutyDetail({ duty, plans, onClose }) {
  const plan = duty
    ? plans.find((p) => p.examId === duty.examId && p.hallId === duty.hallId) ?? null
    : null;

  return (
    <Modal
      open={Boolean(duty)}
      onClose={onClose}
      icon={ShieldCheck}
      title={duty?.examTitle ?? ''}
      description={duty ? `${duty.examCode} · ${formatDate(duty.date, 'long')}` : ''}
      footer={
        duty ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {plan ? (
              <Button as={Link} to="/faculty/hall-plan" leftIcon={Grid3x3} onClick={onClose}>
                Open hall plan
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {duty ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={duty.role} />
            <StatusBadge status={duty.status} />
            <Badge tone="slate" dot>
              {isToday(duty.date) ? 'Today' : relativeTime(duty.date)}
            </Badge>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <Detail label="Venue" icon={MapPin} value={duty.hallName} />
            <Detail label="Reporting time" icon={Clock} value={formatTimeRange(duty.startTime, duty.endTime)} />
            <Detail label="Candidates" icon={Users} value={`${plan?.stats.allocated ?? duty.seatCount ?? 0} students`} />
            <Detail
              label="Plan status"
              icon={Grid3x3}
              value={plan ? `${plan.status} · ${plan.verification.score}/100` : 'No plan published'}
            />
          </dl>

          {plan ? (
            <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-700">
              <p className="text-[13px] font-bold text-ink dark:text-white">Invigilation checklist</p>
              <ul className="mt-2.5 space-y-1.5 text-[12.5px] text-muted">
                {[
                  `Collect the hall key from the estate office 15 minutes before the paper.`,
                  `Verify ${plan.stats.allocated} admit cards against the seating grid.`,
                  `Announce the ${formatTimeRange(plan.startTime, plan.endTime)} window and start the invigilator log.`,
                  `Report any student without an admit card to the examination cell immediately.`,
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[12.5px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              The seating plan for this hall is not published yet. It will appear here once the examination cell
              generates it.
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function Detail({ label, icon: Icon, value }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800/50">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
        <p className="truncate text-[13px] font-bold text-ink dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Calendar helpers
 * ------------------------------------------------------------------ */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** 6×7 grid (Monday-first) covering the given month. */
function buildMonthGrid(cursor, duties) {
  const first = startOfMonth(cursor);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const start = new Date(first);
  start.setDate(start.getDate() - offset);

  const todayKey = toKey(new Date());
  const byDate = new Map();
  duties.forEach((duty) => {
    const key = toKey(duty.date);
    const list = byDate.get(key) ?? [];
    list.push(duty);
    byDate.set(key, list);
  });

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toKey(date);
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === cursor.getMonth(),
      isToday: key === todayKey,
      duties: byDate.get(key) ?? [],
    };
  });
}

const toKey = (value) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export { Duties };
