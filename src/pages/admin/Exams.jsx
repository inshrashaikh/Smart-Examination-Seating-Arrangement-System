import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays, Plus, Pencil, Trash2, Sparkles, Clock, MapPin, Search,
  CheckCircle2, Users,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { DeptBadge, StatusBadge } from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ExamFormModal from '../../components/exams/ExamFormModal';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTimeRange, isToday, relativeTime } from '../../utils/format';
import cn from '../../utils/cn';

export default function Exams() {
  const { exams, halls, students, plans, addExam, editExam, deleteExam, resetExam, loading } = useData();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  /** Set when DELETE /exams/{id} answers 409 — drives the reset-then-delete step. */
  const [resetPrompt, setResetPrompt] = useState(null);
  const [saving, setSaving] = useState(false);

  const counts = useMemo(
    () =>
      exams.reduce(
        (acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }),
        { SCHEDULED: 0, PUBLISHED: 0, COMPLETED: 0 }
      ),
    [exams]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exams
      .filter((e) => {
        if (status !== 'ALL' && e.status !== status) return false;
        if (q && !`${e.title} ${e.code} ${e.course}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [exams, query, status]);

  const planCount = (examId) => plans.filter((p) => p.examId === examId).length;
  const hallCount = (examId) =>
    new Set(plans.filter((p) => p.examId === examId).map((p) => p.hallId)).size;
  const eligibleCount = (exam) =>
    students.filter(
      (s) => exam.departments.includes(s.department) && exam.years.includes(Number(s.year))
    ).length;

  const columns = [
    {
      key: 'title',
      header: 'Exam',
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13.5px] font-bold text-ink dark:text-white">{row.title}</p>
            {isToday(row.date) ? (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                Today
              </span>
            ) : null}
          </div>
          <p className="truncate font-mono text-[11px] text-muted">
            {row.code} · {row.course}
          </p>
        </div>
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
    {
      key: 'departments',
      header: 'Departments',
      sortable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.departments.map((code) => (
            <DeptBadge key={code} code={code} size="sm" />
          ))}
        </div>
      ),
    },
    {
      key: 'eligible',
      header: 'Students',
      sortable: false,
      render: (row) => (
        <span className="whitespace-nowrap text-[13px]">
          <span className="font-semibold text-ink dark:text-slate-100">{eligibleCount(row)}</span>
          <span className="text-muted"> eligible</span>
        </span>
      ),
    },
    {
      key: 'halls',
      header: 'Halls',
      sortable: false,
      render: (row) => (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted">
          <MapPin className="h-3.5 w-3.5" />
          {hallCount(row.id)} assigned
        </span>
      ),
    },
    {
      key: 'plans',
      header: 'Plans',
      sortable: false,
      render: (row) => (
        <span className="whitespace-nowrap text-[13px]">
          <span className="font-semibold text-ink dark:text-slate-100">{planCount(row.id)}</span>
          <span className="text-muted"> generated</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => {
              setEditing(row);
              setFormOpen(true);
            }}
            aria-label={`Edit ${row.title}`}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-500/10"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleting(row)}
            aria-label={`Delete ${row.title}`}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await editExam(editing.id, payload);
        toast.success(`${payload.title} updated.`);
      } else {
        await addExam(payload);
        toast.success(`${payload.title} scheduled for ${formatDate(payload.date)}.`);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error?.message ?? 'Could not save the exam.');
    } finally {
      setSaving(false);
    }
  };

  const nextExam = exams
    .filter((e) => new Date(e.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <DashboardLayout title="Exams" subtitle="Examination Cell · Schedule">
      <PageHeader
        eyebrow="Schedule"
        icon={CalendarDays}
        title="Exams"
        subtitle={`${exams.length} sessions this term · ${counts.SCHEDULED} scheduled · ${counts.PUBLISHED} with published plans.`}
        actions={
          <Button
            leftIcon={Plus}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Schedule exam
          </Button>
        }
      />

      {/* summary cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Next exam"
          value={nextExam ? nextExam.title : 'None scheduled'}
          hint={nextExam ? `${formatDate(nextExam.date)} · ${formatTimeRange(nextExam.startTime, nextExam.endTime)}` : 'Create a session to begin'}
          icon={Clock}
          tone="primary"
        />
        <SummaryCard
          label="Published plans"
          value={`${counts.PUBLISHED} exams`}
          hint="Visible to invigilators"
          icon={CheckCircle2}
          tone="accent"
        />
        <SummaryCard
          label="Eligible students"
          value={`${exams.reduce((sum, e) => sum + eligibleCount(e), 0)}`}
          hint="Across all sessions"
          icon={Users}
          tone="violet"
        />
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">
          {[
            { value: 'ALL', label: 'All', count: exams.length },
            { value: 'SCHEDULED', label: 'Scheduled', count: counts.SCHEDULED },
            { value: 'PUBLISHED', label: 'Published', count: counts.PUBLISHED },
            { value: 'COMPLETED', label: 'Completed', count: counts.COMPLETED },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold transition',
                status === option.value
                  ? 'bg-white text-primary-600 shadow-soft dark:bg-slate-900'
                  : 'text-slate-500 hover:text-ink dark:text-slate-400 dark:hover:text-white'
              )}
            >
              {option.label}
              <span className="rounded-full bg-slate-100 px-1.5 text-[10px] dark:bg-slate-700">{option.count}</span>
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exams by title or code…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-ink placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
          />
        </div>
      </div>

      <Table
        columns={columns}
        rows={rows}
        loading={loading && exams.length === 0}
        searchable={false}
        pageSize={10}
        initialSort={{ key: 'date', dir: 'asc' }}
        emptyIcon={CalendarDays}
        emptyTitle="No exams found"
        emptyDescription="Schedule your first examination to start building seating plans."
        emptyAction={
          <Button
            leftIcon={Plus}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Schedule exam
          </Button>
        }
      />

      {/* upcoming banner */}
      {nextExam ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-primary-600 to-accent-500 p-5 text-white shadow-soft-lg dark:border-slate-800"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
                <Sparkles className="h-3.5 w-3.5" /> Next up
              </p>
              <p className="mt-1 truncate font-display text-xl font-extrabold">{nextExam.title}</p>
              <p className="mt-0.5 text-sm text-white/85">
                {formatDate(nextExam.date, 'long')} · {formatTimeRange(nextExam.startTime, nextExam.endTime)} ·{' '}
                {eligibleCount(nextExam)} students
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="white"
                size="sm"
                leftIcon={Sparkles}
                onClick={() => toast.info('Use the Generate Seating wizard to allocate this exam.')}
              >
                Generate seating
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <Card className="mt-5">
          <EmptyState icon={CalendarDays} title="No upcoming exams" description="Schedule a session to get started." compact />
        </Card>
      )}

      <ExamFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        exam={editing}
        halls={halls}
        students={students}
        saving={saving}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          setDeleting(null);
          setResetPrompt(null);
        }}
        onConfirm={async () => {
          const target = deleting;
          try {
            await deleteExam(target.id);
            toast.success(`${target.title} removed from the schedule.`);
            setDeleting(null);
          } catch (error) {
            // 409 — the exam still owns seat allocations. Offer the reset that
            // `DELETE /api/seating/exam/{id}` performs, then retry.
            if (error?.status === 409) {
              setResetPrompt({ exam: target, message: error.message });
              return;
            }
            toast.error(error?.message ?? 'Could not delete the exam.');
          }
        }}
        title="Delete exam?"
        description={`${deleting?.title} will be removed from the schedule. Seating plans already generated for it will remain available in reports.`}
        confirmLabel="Delete exam"
      />

      {/* Second step, only reached when the backend returns 409. */}
      <ConfirmDialog
        open={Boolean(resetPrompt)}
        onClose={() => setResetPrompt(null)}
        onConfirm={async () => {
          const target = resetPrompt.exam;
          try {
            await resetExam(target.id);
            await deleteExam(target.id);
            toast.success(`${target.title} and its seating plans were removed.`);
            setResetPrompt(null);
            setDeleting(null);
          } catch (error) {
            toast.error(error?.message ?? 'Could not clear the seating plan.');
          }
        }}
        title="Clear the seating plan first?"
        description={
          resetPrompt
            ? `${resetPrompt.message} Resetting discards every plan and allocation for ${resetPrompt.exam.code}, then deletes the exam. This cannot be undone.`
            : ''
        }
        confirmLabel="Reset plan & delete"
        tone="danger"
      />
    </DashboardLayout>
  );
}

function SummaryCard({ label, value, hint, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'from-primary-500/10 to-primary-500/0 text-primary-600 dark:text-primary-300',
    accent: 'from-accent-500/10 to-accent-500/0 text-accent-600 dark:text-accent-300',
    violet: 'from-violet-500/10 to-violet-500/0 text-violet-600 dark:text-violet-300',
  };
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/60"
    >
      <div className={cn('pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl', tones[tone])} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-1 truncate font-display text-lg font-extrabold text-ink dark:text-white">{value}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted">{hint}</p>
        </div>
        <Icon className={cn('h-5 w-5 shrink-0', tones[tone].split(' ').slice(1).join(' '))} />
      </div>
    </motion.div>
  );
}

export { Exams };
