import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileBarChart, Printer, FileSpreadsheet, FileJson, Download, Building2, Users,
  ShieldCheck, GraduationCap, Filter, AlertTriangle, ChevronRight, Clock, CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Tabs from '../../components/ui/Tabs';
import Badge, { DeptBadge, StatusBadge } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Field';
import { ProgressBar, ProgressRing } from '../../components/ui/Progress';
import { Skeleton } from '../../components/ui/Skeleton';
import { DepartmentBarChart } from '../../components/charts/Charts';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { reportService, exportService, SEARCH_DEBOUNCE_MS } from '../../services';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { DEPARTMENTS } from '../../data/departments';
import { formatDate, formatTimeRange } from '../../utils/format';
import cn from '../../utils/cn';

const REPORT_TABS = [
  { value: 'hall', label: 'Hall-wise', icon: Building2 },
  { value: 'department', label: 'Department-wise', icon: GraduationCap },
  { value: 'student', label: 'Student-wise', icon: Users },
  { value: 'attendance', label: 'Attendance', icon: ShieldCheck },
];

/**
 * Reporting centre — four report views with a live preview table and
 * PDF / Excel / CSV / JSON exports for the selected exam.
 */
export default function Reports() {
  const { exams, halls } = useData();
  const toast = useToast();

  const [tab, setTab] = useState('hall');
  const [examId, setExamId] = useState('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  /** Which export button is currently in flight, so only it shows a spinner. */
  const [downloading, setDownloading] = useState(null);

  // Default to the most recent exam that actually has plans.
  useEffect(() => {
    if (!exams.length) return;
    setExamId((current) => current || exams[exams.length - 1].id);
  }, [exams]);

  const exam = useMemo(() => exams.find((e) => e.id === examId) ?? null, [exams, examId]);

  // The search box is debounced so each keystroke does not hit the server.
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  /**
   * Loads the preview payload for the selected report.
   *
   * All four families share one endpoint shape — `?examId` plus, for
   * student-wise, a free-text `search` — so they are one `reportService.get`
   * call with a varying query rather than four branches.
   *
   * Response shapes, straight from the backend:
   *   hall-wise      → { exam, rows[], totals }
   *   department-wise→ { exam, rows[] }
   *   student-wise   → [ { rollNo, name, department, year, section, hall, seat } ]  (a bare array)
   *   attendance     → { exam, halls[], rows[], summary }
   */
  const { data, loading, error, refetch } = useFetch(
    () =>
      examId
        ? reportService.get(tab, {
            examId,
            // Only student-wise supports a free-text filter.
            ...(tab === 'student' ? { search: debouncedSearch.trim() } : {}),
          })
        : Promise.resolve(null),
    [examId, tab, debouncedSearch],
    { immediate: true }
  );

  /* ------------------------------ rows ------------------------------ */
  const rows = useMemo(() => {
    if (!data) return [];
    if (tab === 'hall') return data.rows ?? [];
    if (tab === 'department') return data.rows ?? [];
    if (tab === 'student') {
      return (data ?? []).filter((r) => (deptFilter === 'ALL' ? true : r.department === deptFilter));
    }
    return (data?.rows ?? []).filter((r) =>
      deptFilter === 'ALL' ? true : r.department === deptFilter
    );
  }, [data, tab, deptFilter]);

  /* ----------------------------- summary ---------------------------- */
  const summary = useMemo(() => {
    if (!data || !exam) return null;
    if (tab === 'hall') {
      const allocated = rows.reduce((s, r) => s + r.allocated, 0);
      const capacity = rows.reduce((s, r) => s + r.capacity, 0);
      return {
        cards: [
          { label: 'Halls in report', value: rows.length, icon: Building2, tone: 'primary' },
          { label: 'Seats allocated', value: allocated, icon: Users, tone: 'accent' },
          {
            label: 'Utilisation',
            value: `${capacity ? Math.round((allocated / capacity) * 100) : 0}%`,
            icon: CheckCircle2,
            tone: 'emerald',
          },
          {
            label: 'Invigilators',
            value: rows.reduce((s, r) => s + (r.invigilators ?? 0), 0),
            icon: ShieldCheck,
            tone: 'violet',
          },
        ],
      };
    }
    if (tab === 'department') {
      const allocated = rows.reduce((s, r) => s + r.allocated, 0);
      const unallocated = rows.reduce((s, r) => s + r.unallocated, 0);
      return {
        cards: [
          { label: 'Departments', value: rows.length, icon: GraduationCap, tone: 'primary' },
          { label: 'Students seated', value: allocated, icon: Users, tone: 'accent' },
          { label: 'Unallocated', value: unallocated, icon: AlertTriangle, tone: unallocated ? 'amber' : 'emerald' },
          { label: 'Avg fill rate', value: `${rows.length ? Math.round(rows.reduce((s, r) => s + r.share, 0) / rows.length) : 0}%`, icon: CheckCircle2, tone: 'violet' },
        ],
      };
    }
    if (tab === 'student') {
      const list = data ?? [];
      return {
        cards: [
          { label: 'Students listed', value: list.length, icon: Users, tone: 'primary' },
          { label: 'Confirmed', value: list.filter((r) => r.status === 'CONFIRMED').length, icon: CheckCircle2, tone: 'emerald' },
          { label: 'Provisional', value: list.filter((r) => r.status === 'PROVISIONAL').length, icon: Clock, tone: 'amber' },
          { label: 'Halls used', value: new Set(list.map((r) => r.hall)).size, icon: Building2, tone: 'violet' },
        ],
      };
    }
    const sheet = data ?? { summary: { total: 0, present: 0, absent: 0 } };
    return {
      cards: [
        { label: 'Students on roll', value: sheet.summary.total, icon: Users, tone: 'primary' },
        { label: 'Present', value: sheet.summary.present, icon: CheckCircle2, tone: 'emerald' },
        { label: 'Absent', value: sheet.summary.absent, icon: AlertTriangle, tone: 'rose' },
        {
          label: 'Attendance',
          value: `${sheet.summary.total ? Math.round((sheet.summary.present / sheet.summary.total) * 100) : 0}%`,
          icon: ShieldCheck,
          tone: 'accent',
        },
      ],
    };
  }, [data, rows, tab, exam]);

  /* ----------------------------- exports ---------------------------- */
  const exportRows = useMemo(() => {
    if (tab === 'hall') {
      return rows.map((r) => ({
        Exam: r.examCode,
        Title: r.examTitle,
        Hall: r.hallCode,
        'Hall name': r.hallName,
        Capacity: r.capacity,
        Allocated: r.allocated,
        'Utilisation %': r.utilisation,
        Invigilators: r.invigilators,
        Status: r.status,
      }));
    }
    if (tab === 'department') {
      return rows.map((r) => ({
        Department: r.department,
        Name: r.departmentName,
        Eligible: r.eligible,
        Allocated: r.allocated,
        Unallocated: r.unallocated,
        'Halls used': r.hallsUsed,
        'Share %': r.share,
      }));
    }
    if (tab === 'student') {
      return (data ?? []).map((r) => ({
        'Roll No': r.rollNo,
        Name: r.name,
        Department: r.department,
        Year: r.year,
        Section: r.section,
        Hall: r.hall,
        Seat: r.seat,
        Status: r.status,
      }));
    }
    return (data?.rows ?? []).map((r) => ({
      'Roll No': r.rollNo,
      Name: r.name,
      Department: r.department,
      Year: r.year,
      Section: r.section,
      Hall: r.hall,
      Seat: r.seat,
      Present: r.present ? 'YES' : 'NO',
    }));
  }, [tab, rows, data]);

  const fileBase = `${(exam?.code ?? 'report').toLowerCase()}-${tab}-wise`;

  /**
   * Export.
   *
   * PDF, Excel and CSV are produced **by the backend** — the bytes come straight
   * from `GET /api/reports/{type}?format=…` with `responseType: 'blob'`, so the
   * exported file always reflects the server's own formatting, totals and
   * filters rather than whatever this table happens to be showing.
   *
   * JSON is the exception: the server has no JSON export format (it answers
   * 400), but the page already holds the exact JSON payload for the preview,
   * so that one is written client-side from `data`.
   *
   * `downloading` tracks the in-flight format so each button gets its own
   * spinner rather than disabling the whole toolbar.
   */
  const handleExport = async (format) => {
    if (!exportRows.length) {
      toast.warning('There is nothing to export for this selection.');
      return;
    }

    if (format === 'json') {
      exportService.toJson(data, fileBase);
      toast.success('JSON file downloaded.');
      return;
    }

    setDownloading(format);
    try {
      const result = await reportService.download(tab, examId, null, format);
      const size = result.size ? ` (${Math.max(1, Math.round(result.size / 1024))} KB)` : '';
      toast.success(`Downloaded ${result.filename}${size}.`);
    } catch (error) {
      toast.error(error?.message ?? `The ${format.toUpperCase()} export failed.`);
    } finally {
      setDownloading(null);
    }
  };

  /* ------------------------------ columns --------------------------- */
  const columns = useMemo(() => {
    if (tab === 'hall') {
      return [
        {
          key: 'hallCode',
          header: 'Hall',
          sortable: true,
          render: (row) => (
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-bold text-ink dark:text-white">{row.hallName}</p>
              <p className="truncate font-mono text-[11px] text-muted">{row.hallCode}</p>
            </div>
          ),
        },
        { key: 'capacity', header: 'Capacity', sortable: true, align: 'center' },
        { key: 'allocated', header: 'Allocated', sortable: true, align: 'center' },
        {
          key: 'utilisation',
          header: 'Utilisation',
          sortable: true,
          render: (row) => (
            <div className="w-36">
              <ProgressBar
                value={row.utilisation}
                size="sm"
                tone={row.utilisation > 85 ? 'emerald' : row.utilisation > 60 ? 'primary' : 'amber'}
              />
              <p className="mt-1 text-[10px] font-bold text-muted">{row.utilisation}%</p>
            </div>
          ),
        },
        {
          key: 'departments',
          header: 'Departments',
          sortable: false,
          render: (row) => (
            <div className="flex flex-wrap gap-1">
              {Object.entries(row.departments ?? {}).map(([code, count]) => (
                <Badge key={code} tone="slate" size="sm">
                  {code} · {count}
                </Badge>
              ))}
            </div>
          ),
        },
        { key: 'invigilators', header: 'Invigilators', sortable: true, align: 'center' },
        {
          key: 'status',
          header: 'Status',
          sortable: true,
          render: (row) => <StatusBadge status={row.status} size="sm" />,
        },
      ];
    }
    if (tab === 'department') {
      return [
        {
          key: 'department',
          header: 'Department',
          sortable: true,
          render: (row) => (
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: row.color ?? '#94A3B8' }}
              />
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-ink dark:text-white">{row.department}</p>
                <p className="truncate text-[11px] text-muted">{row.departmentName}</p>
              </div>
            </div>
          ),
        },
        { key: 'eligible', header: 'Eligible', sortable: true, align: 'center' },
        { key: 'allocated', header: 'Seated', sortable: true, align: 'center' },
        {
          key: 'unallocated',
          header: 'Unallocated',
          sortable: true,
          align: 'center',
          render: (row) => (
            <span
              className={cn(
                'font-bold',
                row.unallocated ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {row.unallocated}
            </span>
          ),
        },
        { key: 'hallsUsed', header: 'Halls', sortable: true, align: 'center' },
        {
          key: 'share',
          header: 'Fill rate',
          sortable: true,
          render: (row) => (
            <div className="w-32">
              <ProgressBar value={row.share} size="sm" tone={row.share > 85 ? 'emerald' : 'primary'} />
              <p className="mt-1 text-[10px] font-bold text-muted">{row.share}%</p>
            </div>
          ),
        },
      ];
    }
    if (tab === 'student') {
      return [
        { key: 'rollNo', header: 'Roll No', sortable: true, render: (row) => (
          <span className="font-mono text-[12px] font-bold text-ink dark:text-slate-100">{row.rollNo}</span>
        ) },
        {
          key: 'name',
          header: 'Student',
          sortable: true,
          render: (row) => (
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-ink dark:text-slate-100">{row.name}</p>
              <p className="truncate text-[11px] text-muted">
                Year {row.year} · Section {row.section}
              </p>
            </div>
          ),
        },
        {
          key: 'department',
          header: 'Department',
          sortable: true,
          render: (row) => <DeptBadge code={row.department} size="sm" />,
        },
        { key: 'hall', header: 'Hall', sortable: true },
        {
          key: 'seat',
          header: 'Seat',
          sortable: true,
          align: 'center',
          render: (row) => (
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {row.seat}
            </span>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          sortable: true,
          render: (row) => <StatusBadge status={row.status} size="sm" />,
        },
      ];
    }
    return [
      { key: 'rollNo', header: 'Roll No', sortable: true, render: (row) => (
        <span className="font-mono text-[12px] font-bold text-ink dark:text-slate-100">{row.rollNo}</span>
      ) },
      {
        key: 'name',
        header: 'Student',
        sortable: true,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-ink dark:text-slate-100">{row.name}</p>
            <p className="truncate text-[11px] text-muted">
              Year {row.year} · Section {row.section}
            </p>
          </div>
        ),
      },
      { key: 'department', header: 'Department', sortable: true, render: (row) => <DeptBadge code={row.department} size="sm" /> },
      { key: 'hall', header: 'Hall', sortable: true },
      { key: 'seat', header: 'Seat', sortable: true, align: 'center' },
      {
        key: 'present',
        header: 'Attendance',
        sortable: true,
        render: (row) => <StatusBadge status={row.present ? 'PRESENT' : 'ABSENT'} size="sm" />,
      },
    ];
  }, [tab]);

  const attendanceRate =
    tab === 'attendance' && data?.summary?.total
      ? Math.round((data.summary.present / data.summary.total) * 100)
      : null;

  return (
    <DashboardLayout title="Reports" subtitle="Examination Cell · Exports">
      <PageHeader
        eyebrow="Analytics"
        icon={FileBarChart}
        title="Reports & exports"
        subtitle="Hall-wise, department-wise, student-wise and attendance sheets — exported by the server as PDF, Excel or CSV."
        breadcrumb={[
          { label: 'Examination Cell', to: '/admin' },
          { label: 'Reports' },
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={Printer}
              loading={downloading === 'pdf'}
              disabled={Boolean(downloading)}
              onClick={() => handleExport('pdf')}
            >
              PDF
            </Button>
            <Button
              variant="secondary"
              leftIcon={FileSpreadsheet}
              loading={downloading === 'excel'}
              disabled={Boolean(downloading)}
              onClick={() => handleExport('excel')}
            >
              Excel
            </Button>
            <Button
              variant="secondary"
              leftIcon={Download}
              loading={downloading === 'csv'}
              disabled={Boolean(downloading)}
              onClick={() => handleExport('csv')}
            >
              CSV
            </Button>
          </>
        }
      />

      {/* ---------------- filters ---------------- */}
      <Card className="mb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Select
              label="Exam"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              options={exams.map((e) => ({
                value: e.id,
                label: `${e.code} · ${e.title} (${formatDate(e.date)})`,
              }))}
            />
            <Select
              label="Department filter"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All departments' },
                ...DEPARTMENTS.map((d) => ({ value: d.code, label: `${d.code} — ${d.name}` })),
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-[13px] font-semibold text-muted">
              {exam ? `${formatDate(exam.date, 'long')} · ${formatTimeRange(exam.startTime, exam.endTime)}` : '—'}
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Tabs tabs={REPORT_TABS} value={tab} onChange={setTab} variant="segmented" size="sm" />
        </div>
      </Card>

      {/* ---------------- fetch failure ---------------- */}
      {error ? (
        <Card className="mb-5 border-rose-200 dark:border-rose-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="text-[13.5px] font-bold text-ink dark:text-white">
                  Could not load this report
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

      {/* ---------------- summary cards ---------------- */}
      {summary ? (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.cards.map((card, index) => (
            <StatCard
              key={card.label}
              index={index}
              label={card.label}
              value={card.value}
              icon={card.icon}
              tone={card.tone}
            />
          ))}
        </div>
      ) : null}

      {/* ---------------- attendance hero ---------------- */}
      {tab === 'attendance' && data ? (
        <Card className="print-area mb-5">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-center sm:text-left">
              <CardTitle
                icon={ShieldCheck}
                title="Attendance summary"
                subtitle={`${data.exam?.code} · ${data.exam?.title} · ${formatDate(data.exam?.date, 'long')}`}
              />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge tone="success" dot>
                  {data.summary.present} present
                </Badge>
                <Badge tone="danger" dot>
                  {data.summary.absent} absent
                </Badge>
                <Badge tone="slate">{data.summary.total} on roll</Badge>
              </div>
            </div>
            <ProgressRing value={attendanceRate ?? 0} size={130} tone="emerald" label="present" />
          </div>
        </Card>
      ) : null}

      {/* ---------------- department chart ---------------- */}
      {tab === 'department' && rows.length ? (
        <Card className="print-area mb-5">
          <CardHeader>
            <CardTitle
              icon={GraduationCap}
              title="Eligible vs allocated"
              subtitle="Department breakdown for the selected exam"
            />
          </CardHeader>
          <div className="mt-5">
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <DepartmentBarChart
                data={rows.map((r) => ({ department: r.department, eligible: r.eligible, allocated: r.allocated }))}
              />
            )}
          </div>
        </Card>
      ) : null}

      {/* ---------------- preview table ---------------- */}
      <div className="print-area">
        <Table
          columns={columns}
          rows={rows}
          loading={loading}
          pageSize={tab === 'student' || tab === 'attendance' ? 25 : 10}
          rowKey={(row, index) => `${row.rollNo ?? row.hallCode ?? row.department}-${index}`}
          searchPlaceholder={tab === 'hall' ? 'Search halls…' : 'Search roll number or name…'}
          initialSort={{ key: tab === 'hall' ? 'utilisation' : 'rollNo', dir: tab === 'hall' ? 'desc' : 'asc' }}
          emptyIcon={FileBarChart}
          emptyTitle="No report data"
          emptyDescription="Generate a seating plan for this exam first, then the report fills itself."
        />
      </div>

      {/* ---------------- footer note ---------------- */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-4 flex items-center gap-2 text-[11px] text-muted"
      >
        <FileJson className="h-3.5 w-3.5" />
        {exportRows.length} row(s) ready to export
        <button
          type="button"
          onClick={() => handleExport('json')}
          className="font-semibold text-primary-600 hover:underline dark:text-primary-300"
        >
          Download raw JSON
        </button>
        <span className="hidden sm:inline">
          · PDF, Excel and CSV are generated by the server
        </span>
        {halls.length ? (
          <span className="hidden sm:inline">· {halls.length} halls mapped on campus</span>
        ) : null}
        <ChevronRight className="hidden h-3 w-3 sm:inline" />
      </motion.p>
    </DashboardLayout>
  );
}

export { Reports };
