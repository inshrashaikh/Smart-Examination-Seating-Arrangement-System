import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCog, UserPlus, Mail, Phone, Trash2, CalendarClock, ShieldCheck, Users,
  Clock, Building2, Briefcase, CheckCircle2, CalendarDays,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Tabs from '../../components/ui/Tabs';
import Badge, { DeptBadge, StatusBadge, Avatar } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DutyAssignModal from '../../components/faculty/DutyAssignModal';
import { WorkloadDonut } from '../../components/charts/Charts';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTimeRange, relativeTime } from '../../utils/format';
import cn from '../../utils/cn';

/**
 * Faculty roster + invigilation duty allocation.
 * Two views: Roster (table of faculty) and Duty roster (every assigned duty).
 */
export default function Faculty() {
  const { faculty, exams, halls, duties, addDuty, removeDuty } = useData();
  const toast = useToast();

  const [view, setView] = useState('roster');
  const [assignOpen, setAssignOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  /* ------------------------------ stats ------------------------------ */
  const stats = useMemo(() => {
    const workload = new Map();
    duties.forEach((duty) => {
      const list = workload.get(duty.facultyId) ?? [];
      list.push(duty);
      workload.set(duty.facultyId, list);
    });
    const unassigned = faculty.length - workload.size;
    const today = new Date().toDateString();
    return {
      total: faculty.length,
      onDuty: workload.size,
      unassigned,
      todayDuties: duties.filter((d) => new Date(d.date).toDateString() === today).length,
      chiefCount: duties.filter((d) => d.role === 'CHIEF_INVIGILATOR').length,
      workload,
    };
  }, [faculty, duties]);

  const workloadChart = useMemo(
    () =>
      faculty
        .map((f) => ({
          name: f.id,
          value: (stats.workload.get(f.id) ?? []).length,
          color: f.department === 'CSE' ? '#4F46E5' : f.department === 'IT' ? '#14B8A6' : '#94A3B8',
        }))
        .filter((row) => row.value > 0)
        .sort((a, b) => b.value - a.value),
    [faculty, stats.workload]
  );

  /* ------------------------------ handlers ---------------------------- */
  const handleAssign = async (payload) => {
    setSaving(true);
    try {
      await addDuty(payload);
      const person = faculty.find((f) => f.id === payload.facultyId);
      const hall = halls.find((h) => h.id === payload.hallId);
      toast.success(`${person?.name ?? 'Faculty'} assigned to ${hall?.name ?? 'hall'}.`);
      setAssignOpen(false);
      setView('duties');
    } catch (error) {
      toast.error(error?.message ?? 'Could not assign the duty.');
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ columns ----------------------------- */
  const facultyColumns = [
    {
      key: 'name',
      header: 'Faculty',
      sortable: true,
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={row.name} photo={row.photo} department={row.department} size={38} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-bold text-ink dark:text-white">{row.name}</p>
            <p className="truncate text-[11px] text-muted">{row.designation}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (row) => <DeptBadge code={row.department} size="sm" />,
    },
    { key: 'employeeId', header: 'Employee ID', sortable: true, render: (row) => (
      <span className="font-mono text-[11.5px] text-slate-600 dark:text-slate-300">{row.employeeId}</span>
    ) },
    {
      key: 'contact',
      header: 'Contact',
      sortable: false,
      render: (row) => (
        <div className="min-w-0 space-y-0.5">
          <p className="flex items-center gap-1.5 truncate text-[12px] text-slate-600 dark:text-slate-300">
            <Mail className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{row.email}</span>
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <Phone className="h-3 w-3 shrink-0 text-slate-400" />
            {row.phone}
          </p>
        </div>
      ),
    },
    {
      key: 'dutyPreference',
      header: 'Preference',
      sortable: true,
      render: (row) => (
        <Badge tone={row.dutyPreference === 'MORNING' ? 'warning' : row.dutyPreference === 'EVENING' ? 'violet' : 'slate'} size="sm">
          {row.dutyPreference === 'ANY' ? 'Any slot' : `${row.dutyPreference[0]}${row.dutyPreference.slice(1).toLowerCase()}`}
        </Badge>
      ),
    },
    {
      key: 'duties',
      header: 'Duties',
      sortable: true,
      align: 'center',
      render: (row) => {
        const count = (stats.workload.get(row.id) ?? []).length;
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[12px] font-bold',
              count === 0
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                : count > row.maxDutiesPerDay
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
            )}
          >
            {count} / {row.maxDutiesPerDay}
          </span>
        );
      },
    },
  ];

  const dutyColumns = [
    {
      key: 'facultyName',
      header: 'Faculty',
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-ink dark:text-white">{row.facultyName}</p>
          <p className="truncate text-[11px] text-muted">{row.facultyEmail}</p>
        </div>
      ),
    },
    {
      key: 'examTitle',
      header: 'Exam',
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-ink dark:text-slate-100">{row.examTitle}</p>
          <p className="truncate font-mono text-[11px] text-muted">{row.examCode}</p>
        </div>
      ),
    },
    {
      key: 'hallName',
      header: 'Hall',
      sortable: true,
      render: (row) => (
        <span className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-300">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          {row.hallName}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date & time',
      sortable: true,
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-[13px] font-semibold text-ink dark:text-slate-100">{formatDate(row.date)}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted">
            <Clock className="h-3 w-3" />
            {formatTimeRange(row.startTime, row.endTime)} · {relativeTime(row.date)}
          </p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', sortable: true, render: (row) => <StatusBadge status={row.role} size="sm" /> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} size="sm" /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (row) => (
        <button
          type="button"
          onClick={() => setRemoving(row)}
          aria-label={`Remove duty for ${row.facultyName}`}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  /* ------------------------------ render ------------------------------ */
  return (
    <DashboardLayout title="Faculty" subtitle="Examination Cell · Roster & duties">
      <PageHeader
        eyebrow="Invigilation"
        icon={UserCog}
        title="Faculty management"
        subtitle={`${faculty.length} faculty members on the roster · ${duties.length} duties assigned across ${exams.length} exams.`}
        breadcrumb={[
          { label: 'Examination Cell', to: '/admin' },
          { label: 'Faculty' },
        ]}
        actions={
          <Button leftIcon={UserPlus} onClick={() => setAssignOpen(true)}>
            Assign duty
          </Button>
        }
      />

      {/* ---------------- stats ---------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="Faculty on roster" value={stats.total} icon={Users} tone="primary" hint="Across 5 departments" />
        <StatCard
          index={1}
          label="With at least one duty"
          value={stats.onDuty}
          icon={CheckCircle2}
          tone="emerald"
          hint={stats.unassigned ? `${stats.unassigned} awaiting assignment` : 'Everyone is allocated'}
        />
        <StatCard index={2} label="Duties today" value={stats.todayDuties} icon={CalendarDays} tone="amber" hint={`${stats.chiefCount} chief invigilators overall`} />
        <StatCard index={3} label="Total duties" value={duties.length} icon={CalendarClock} tone="violet" hint="Assigned this term" />
      </div>

      {/* ---------------- workload + unassigned ---------------- */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle icon={Briefcase} title="Duty workload" subtitle="Faculty with the most assignments" />
          </CardHeader>
          <div className="mt-4">
            {workloadChart.length ? (
              <>
                <WorkloadDonut data={workloadChart} height={200} />
                <ul className="mt-3 space-y-1.5">
                  {workloadChart.slice(0, 5).map((row) => {
                    const person = faculty.find((f) => f.id === row.name);
                    return (
                      <li key={row.name} className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink dark:text-slate-200">
                          {person?.name ?? row.name}
                        </span>
                        <span className="text-[12px] font-bold text-muted">{row.value} duties</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="No duties yet"
                description="Assign your first duty to see the workload distribution."
                compact
                action={
                  <Button size="sm" leftIcon={UserPlus} onClick={() => setAssignOpen(true)}>
                    Assign duty
                  </Button>
                }
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            action={
              <Badge tone={stats.unassigned ? 'warning' : 'success'} dot>
                {stats.unassigned ? `${stats.unassigned} idle` : 'All allocated'}
              </Badge>
            }
          >
            <CardTitle
              icon={ShieldCheck}
              title="Faculty awaiting duty"
              subtitle="Members with no invigilation assignment this term"
            />
          </CardHeader>

          {(() => {
            const idle = faculty.filter((f) => !(stats.workload.get(f.id) ?? []).length);
            if (!idle.length) {
              return (
                <EmptyState
                  icon={CheckCircle2}
                  title="Everyone has a duty"
                  description="The whole roster is allocated for the current term."
                  compact
                />
              );
            }
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 grid gap-2.5 sm:grid-cols-2"
              >
                {idle.map((person, index) => (
                  <motion.div
                    key={person.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700 dark:bg-slate-900/40"
                  >
                    <Avatar name={person.name} photo={person.photo} department={person.department} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink dark:text-white">{person.name}</p>
                      <p className="truncate text-[10.5px] text-muted">
                        {person.department} · prefers {person.dutyPreference.toLowerCase()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignOpen(true);
                        setView('duties');
                      }}
                      aria-label={`Assign duty to ${person.name}`}
                      className="shrink-0 rounded-lg p-2 text-primary-500 transition hover:bg-primary-50 dark:hover:bg-primary-500/15"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            );
          })()}
        </Card>
      </div>

      {/* ---------------- tabs + table ---------------- */}
      <div className="mt-5">
        <Tabs
          tabs={[
            { value: 'roster', label: 'Roster', icon: Users, count: faculty.length },
            { value: 'duties', label: 'Duty roster', icon: CalendarClock, count: duties.length },
          ]}
          value={view}
          onChange={setView}
          variant="segmented"
          size="sm"
          className="mb-4"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {view === 'roster' ? (
              <Table
                columns={facultyColumns}
                rows={faculty}
                pageSize={10}
                searchPlaceholder="Search faculty by name, email or department…"
                searchKeys={['name', 'email', 'department', 'designation']}
                initialSort={{ key: 'name', dir: 'asc' }}
                rowKey={(row) => row.id}
                emptyIcon={Users}
                emptyTitle="No faculty yet"
                emptyDescription="Faculty records sync from the university directory."
              />
            ) : (
              <Table
                columns={dutyColumns}
                rows={duties}
                pageSize={10}
                searchPlaceholder="Search duty by faculty, exam or hall…"
                initialSort={{ key: 'date', dir: 'asc' }}
                rowKey={(row) => row.id}
                emptyIcon={CalendarClock}
                emptyTitle="No duties assigned"
                emptyDescription="Assign an invigilation duty to build the roster."
                emptyAction={
                  <Button leftIcon={UserPlus} onClick={() => setAssignOpen(true)}>
                    Assign duty
                  </Button>
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <DutyAssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSubmit={handleAssign}
        faculty={faculty}
        exams={exams}
        halls={halls}
        existingDuties={duties}
        saving={saving}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          try {
            await removeDuty(removing.id);
            toast.success(`${removing.facultyName}'s duty in ${removing.hallName} was removed.`);
          } catch (error) {
            toast.error(error?.message ?? 'Could not remove the duty.');
          }
        }}
        title="Remove this duty?"
        description={`${removing?.facultyName} will no longer invigilate ${removing?.examTitle} in ${removing?.hallName} on ${formatDate(removing?.date)}.`}
        confirmLabel="Remove duty"
      />
    </DashboardLayout>
  );
}

export { Faculty };
