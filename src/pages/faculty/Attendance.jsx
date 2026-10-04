import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Printer, FileSpreadsheet, Download, UserCheck, UserX, Users,
  Building2, Search, RotateCcw, CheckCircle2, AlertTriangle, Grid3x3, Info, RefreshCw,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Badge, { DeptBadge, StatusBadge, Avatar } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Field';
import { ProgressBar, ProgressRing } from '../../components/ui/Progress';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { facultyService, downloadAttendanceSheet } from '../../services';
import useFetch from '../../hooks/useFetch';
import { DEPARTMENTS } from '../../data/departments';
import { formatDate, formatTimeRange } from '../../utils/format';
import cn from '../../utils/cn';

/**
 * Invigilator attendance sheet — mark present / absent per candidate for a
 * hall, then print or export the signed sheet.
 *
 * Reads come from `GET /api/duties/my/hall/{hallId}/attendance?examId=`, which
 * the backend scopes to halls this member actually invigilates (403 otherwise)
 * and which returns the same `AttendanceSheet` the admin reports page uses:
 * `{ exam, halls[], rows[], summary }`. Rows carry
 * `{ allocationId, rollNo, name, department, year, section, hall, hallCode, seat, present }`.
 *
 * Present/absent marks are **persisted**: every toggle POSTs the full batch to
 * `POST /api/duties/my/hall/{hallId}/attendance?examId=`, which is idempotent
 * per `allocationId` and returns the refreshed sheet. A dropped request can
 * safely be retried — re-posting overwrites rather than duplicates.
 */
export default function Attendance() {
  const { user } = useAuth();
  const { duties } = useData();
  const toast = useToast();

  const [examId, setExamId] = useState('');
  const [hallId, setHallId] = useState('');
  const [marks, setMarks] = useState({});
  const [deptFilter, setDeptFilter] = useState('ALL');
  /** Which export button is in flight, so only it shows a spinner. */
  const [downloading, setDownloading] = useState(null);
  /** True while a mark batch is being POSTed; drives the "Saving…" indicator. */
  const [saving, setSaving] = useState(false);

  /**
   * Exam/hall options come from **duties**, not from seating plans: a duty is
   * what makes a hall legible to this invigilator, and it is the only list the
   * backend scopes to them here.
   */
  const examOptions = useMemo(() => {
    const seen = new Map();
    duties.forEach((d) => {
      if (!seen.has(d.examId)) {
        seen.set(d.examId, {
          examId: d.examId,
          examCode: d.examCode,
          examTitle: d.examTitle,
          date: d.date,
          halls: [],
        });
      }
      seen.get(d.examId).halls.push({
        id: d.hallId,
        label: `${d.hallName} · ${d.hallCode} (${d.seatCount} candidates)`,
      });
    });
    return [...seen.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [duties]);

  // Defaults: today's duty if there is one, else the next exam on the roster.
  useEffect(() => {
    if (examId || !examOptions.length) return;
    const today = new Date().toDateString();
    const todayDuty = duties.find((d) => new Date(d.date).toDateString() === today);
    const fallback = examOptions[0];
    const target = todayDuty ?? { examId: fallback.examId, hallId: fallback.halls[0]?.id };
    setExamId(target.examId);
    setHallId(target.hallId ?? '');
  }, [examOptions, examId, duties]);

  const hallsForExam = useMemo(
    () => examOptions.find((o) => o.examId === examId)?.halls ?? [],
    [examOptions, examId]
  );

  // Keep the hall valid whenever the exam changes.
  useEffect(() => {
    if (hallId && hallsForExam.some((h) => h.id === hallId)) return;
    setHallId(hallsForExam[0]?.id ?? '');
  }, [hallsForExam, hallId]);

  /* ------------------------------ load ------------------------------ */
  const { data: sheet, loading, error, refetch } = useFetch(
    () =>
      hallId && examId
        ? facultyService.getMyAttendance(hallId, examId)
        : Promise.resolve(null),
    [hallId, examId],
    { immediate: true }
  );

  // Seed the toggles from the generated roll whenever a new sheet lands.
  useEffect(() => {
    const next = {};
    (sheet?.rows ?? []).forEach((row) => {
      next[row.rollNo] = Boolean(row.present);
    });
    setMarks(next);
  }, [sheet]);

  /**
   * PDF / Excel / CSV come from the server via the duty-scoped
   * `GET /api/duties/my/hall/{hallId}/attendance?examId=&format=`, which honours
   * `format` (through the shared `TableDownloader`) and is scoped to this
   * invigilator's own hall — a request for a hall they do not invigilate is a
   * 403, not a file.
   */
  const handleExport = async (format) => {
    if (!examId || !hallId) return;
    setDownloading(format);
    try {
      const result = await downloadAttendanceSheet(hallId, examId, format);
      toast.success(`Downloaded ${result.filename}.`);
    } catch (err) {
      toast.error(err?.message ?? `The ${format.toUpperCase()} export failed.`);
    } finally {
      setDownloading(null);
    }
  };

  /**
   * POSTs the current marks to `POST /api/duties/my/hall/{hallId}/attendance`.
   *
   * The whole batch goes every time rather than just the toggled seat: the
   * endpoint is idempotent per `allocationId`, the sheet is small, and a
   * full-sheet post means a lost request never leaves a half-written state.
   * On success the returned sheet's `present` flags are adopted, so the UI
   * renders what was actually stored.
   */
  const persistMarks = async (next) => {
    if (!hallId || !examId || !sheet) return;
    setSaving(true);
    try {
      const records = sheet.rows.map((r) => ({
        allocationId: r.allocationId,
        present: Boolean(next[r.rollNo]),
      }));
      const fresh = await facultyService.markAttendance(hallId, examId, records);
      if (fresh?.rows) {
        const adopted = {};
        fresh.rows.forEach((r) => {
          adopted[r.rollNo] = Boolean(r.present);
        });
        setMarks(adopted);
      }
    } catch (err) {
      toast.error(err?.message ?? 'Could not save the attendance marks.');
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ state ----------------------------- */
  const rows = useMemo(() => {
    const all = sheet?.rows ?? [];
    if (deptFilter === 'ALL') return all;
    return all.filter((r) => r.department === deptFilter);
  }, [sheet, deptFilter]);

  const presentCount = useMemo(
    () => rows.filter((r) => marks[r.rollNo]).length,
    [rows, marks]
  );
  const absentCount = rows.length - presentCount;
  const rate = rows.length ? Math.round((presentCount / rows.length) * 100) : 0;

  /**
   * The hall's name and code come from the duty that owns it rather than a
   * seating plan — `sheet.halls[0]` is the same `{ id, name, code }` triple.
   */
  const hall = useMemo(() => {
    const fromSheet = sheet?.halls?.find((h) => h.id === hallId) ?? null;
    return fromSheet ? { hallName: fromSheet.name, hallCode: fromSheet.code } : null;
  }, [sheet, hallId]);

  const toggle = (rollNo) => {
    const next = { ...marks, [rollNo]: !marks[rollNo] };
    setMarks(next);
    void persistMarks(next);
  };

  const markAll = (value) => {
    const next = { ...marks };
    rows.forEach((r) => {
      next[r.rollNo] = value;
    });
    setMarks(next);
    void persistMarks(next);
    toast.info(value ? `Marked ${rows.length} candidates present.` : `Marked ${rows.length} candidates absent.`);
  };

  const exportRows = useMemo(
    () =>
      rows.map((r) => ({
        'Roll No': r.rollNo,
        Name: r.name,
        Department: r.department,
        Year: r.year,
        Section: r.section,
        Hall: r.hall,
        Seat: r.seat,
        Attendance: marks[r.rollNo] ? 'PRESENT' : 'ABSENT',
      })),
    [rows, marks]
  );

  /* ---------------------------- columns ---------------------------- */
  const columns = [
    { key: 'rollNo', header: 'Roll No', sortable: true, render: (row) => (
      <span className="font-mono text-[12px] font-bold text-ink dark:text-slate-100">{row.rollNo}</span>
    ) },
    {
      key: 'name',
      header: 'Student',
      sortable: true,
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={row.name} department={row.department} size={32} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-ink dark:text-slate-100">{row.name}</p>
            <p className="truncate text-[11px] text-muted">
              Year {row.year} · Section {row.section}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'department', header: 'Dept', sortable: true, render: (row) => <DeptBadge code={row.department} size="sm" /> },
    { key: 'seat', header: 'Seat', sortable: true, align: 'center', render: (row) => (
      <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {row.seat}
      </span>
    ) },
    {
      key: 'attendance',
      header: 'Attendance',
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => toggle(row.rollNo)}
          aria-label={`Mark ${row.name} as ${marks[row.rollNo] ? 'absent' : 'present'}`}
          className={cn(
            'inline-flex h-8 w-[104px] items-center justify-center gap-1.5 rounded-xl text-[12px] font-bold transition',
            marks[row.rollNo]
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300'
          )}
        >
          {marks[row.rollNo] ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
          {marks[row.rollNo] ? 'Present' : 'Absent'}
        </button>
      ),
    },
  ];

  /* ----------------------------- render ---------------------------- */
  return (
    <DashboardLayout title="Attendance Sheet" subtitle="Invigilator Portal">
      <PageHeader
        eyebrow="Invigilator log"
        icon={ShieldCheck}
        title="Attendance sheet"
        subtitle="Mark each candidate present or absent as the hall fills, then print the sheet for your file."
        breadcrumb={[{ label: 'Invigilator Portal', to: '/faculty' }, { label: 'Attendance Sheet' }]}
        actions={
          <>
            <Button variant="ghost" leftIcon={RotateCcw} onClick={refetch} loading={loading}>
              Reload roll
            </Button>
            <Button
              variant="secondary"
              leftIcon={FileSpreadsheet}
              disabled={!exportRows.length || Boolean(downloading)}
              loading={downloading === 'excel'}
              onClick={() => handleExport('excel')}
            >
              Excel
            </Button>
            <Button
              variant="secondary"
              leftIcon={Download}
              disabled={!exportRows.length || Boolean(downloading)}
              loading={downloading === 'csv'}
              onClick={() => handleExport('csv')}
            >
              CSV
            </Button>
            <Button
              leftIcon={Printer}
              disabled={!exportRows.length || Boolean(downloading)}
              loading={downloading === 'pdf'}
              onClick={() => handleExport('pdf')}
            >
              Print / PDF
            </Button>
          </>
        }
      />

      {/* ---------------- selectors ---------------- */}
      <Card className="mb-5">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1.4fr_1fr]">
          <Select
            label="Exam"
            value={examId}
            onChange={(e) => {
              setExamId(e.target.value);
              setHallId('');
            }}
            options={examOptions.map((o) => ({
              value: o.examId,
              label: `${o.examCode} · ${o.examTitle} (${formatDate(o.date)})`,
            }))}
          />
          <Select
            label="Hall"
            value={hallId}
            onChange={(e) => setHallId(e.target.value)}
            options={hallsForExam}
          />
          <Select
            label="Department"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All departments' },
              ...DEPARTMENTS.map((d) => ({ value: d.code, label: `${d.code} — ${d.name}` })),
            ]}
          />
        </div>

        {sheet?.exam ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-[12.5px] text-muted dark:border-slate-800">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary-500" />
              {hall?.hallName ?? sheet.halls?.[0]?.name ?? 'Hall'}
            </span>
            <span>{formatDate(sheet.exam.date, 'long')}</span>
            <span>{formatTimeRange(sheet.exam.startTime, sheet.exam.endTime)}</span>
            <Button as={Link} to="/faculty/hall-plan" variant="ghost" size="sm" leftIcon={Grid3x3} className="ml-auto">
              View seating grid
            </Button>
          </div>
        ) : null}
      </Card>

      {/* ---------------- fetch failure ---------------- */}
      {error ? (
        <Card className="mb-5 border-rose-200 dark:border-rose-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="text-[13.5px] font-bold text-ink dark:text-white">
                  Could not load the attendance sheet
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

      {/* ---------------- no duty at all ---------------- */}
      {!duties.length && !loading ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No invigilation duties"
            description="You have not been assigned to a hall yet. The examination cell assigns duties from the Faculty roster."
            action={
              <Button as={Link} to="/faculty" variant="secondary">
                Back to dashboard
              </Button>
            }
          />
        </Card>
      ) : !rows.length && !loading ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No attendance sheet"
            description="The examination cell has not published a seating plan for this hall and exam yet. Check back once the plan is generated."
            action={
              <Button as={Link} to="/faculty/hall-plan" variant="secondary" leftIcon={Grid3x3}>
                View hall plans
              </Button>
            }
          />
        </Card>
      ) : error ? (
        // The retry card above already explains the failure; keep the layout clean.
        <div />
      ) : (
        <>
          {/* ---------------- summary ---------------- */}
          <div className="mb-5 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="flex flex-col items-center justify-center">
              <ProgressRing value={rate} size={148} tone={rate >= 90 ? 'emerald' : rate >= 75 ? 'amber' : 'rose'}>
                <div>
                  <p className="font-display text-3xl font-extrabold leading-none text-ink dark:text-white">{rate}%</p>
                  <p className="mt-1 text-[11px] font-semibold text-muted">attendance</p>
                </div>
              </ProgressRing>

              <div className="mt-5 w-full space-y-2.5">
                <ProgressBar value={presentCount} max={rows.length || 1} tone="emerald" size="sm" label="Present" />
                <ProgressBar value={absentCount} max={rows.length || 1} tone="rose" size="sm" label="Absent" />
              </div>

              <div className="mt-5 flex w-full gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  leftIcon={CheckCircle2}
                  disabled={!rows.length}
                  onClick={() => markAll(true)}
                >
                  All present
                </Button>
                <Button
                  variant="softDanger"
                  size="sm"
                  fullWidth
                  leftIcon={AlertTriangle}
                  disabled={!rows.length}
                  onClick={() => markAll(false)}
                >
                  All absent
                </Button>
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-center text-[11px] text-muted">
                <Info className="h-3 w-3 shrink-0" />
                {saving
                  ? 'Saving marks…'
                  : 'Marks are saved to the server as you toggle them — they survive a reload.'}
              </p>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard index={0} label="On roll" value={rows.length} icon={Users} tone="primary" />
              <StatCard index={1} label="Present" value={presentCount} icon={UserCheck} tone="emerald" />
              <StatCard index={2} label="Absent" value={absentCount} icon={UserX} tone="rose" />
            </div>
          </div>

          {/* ---------------- sheet ---------------- */}
          <div className="print-area">
            <div className="mb-3 hidden print:block">
              <p className="font-display text-lg font-extrabold">Invigilation Attendance Sheet</p>
              <p className="text-xs">
                {sheet?.exam?.code} · {sheet?.exam?.title} · {formatDate(sheet?.exam?.date, 'long')} ·{' '}
                {hall?.hallName ?? ''}
              </p>
            </div>

            <Table
              columns={columns}
              rows={rows}
              loading={loading && !sheet}
              pageSize={25}
              rowKey={(row) => row.rollNo}
              searchable={false}
              searchPlaceholder="Search candidates…"
              initialSort={{ key: 'rollNo', dir: 'asc' }}
              emptyIcon={Search}
              emptyTitle="No candidates in this hall"
              emptyDescription="Adjust the exam, hall or department filter."
              toolbar={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success" dot>
                    {presentCount} present
                  </Badge>
                  <Badge tone="danger" dot>
                    {absentCount} absent
                  </Badge>
                </div>
              }
              footer={
                <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-muted">
                  <p>
                    Invigilator: <span className="font-semibold text-ink dark:text-slate-200">{user?.name}</span> ·{' '}
                    {user?.employeeId}
                  </p>
                  <p className="flex items-center gap-4">
                    <span>Signature: ______________________</span>
                    <span>Date: ____________</span>
                  </p>
                </div>
              }
            />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export { Attendance };
