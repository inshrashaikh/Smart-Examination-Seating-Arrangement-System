import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Users, UserPlus, Upload, Pencil, Trash2, Download, Mail, GraduationCap, Filter,
  AlertTriangle, RefreshCw,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import { FilterBar } from '../../components/ui/Tabs';
import { Avatar, DeptBadge } from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StudentFormModal from '../../components/students/StudentFormModal';
import BulkUploadModal from '../../components/students/BulkUploadModal';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { studentService, exportService, SEARCH_DEBOUNCE_MS } from '../../services';
import { DEPARTMENTS, YEARS, getDepartment } from '../../data/departments';
import { formatDate } from '../../utils/format';
import cn from '../../utils/cn';

/** Rows per page. Kept small so the server round trip is visible in devtools. */
const PAGE_SIZE = 10;

/**
 * Student register.
 *
 * Filtering, searching and paging all happen **on the server** —
 * `GET /api/students?page&pageSize&search&department&year` returns a
 * `PageResponse`, and the table is put into `serverSide` mode so it never
 * re-slices locally. Search is debounced by 400ms so typing "kavya" costs one
 * request instead of five.
 *
 * The store's `students` list is only used for the department tally cards,
 * which are cheap to keep client-side and would otherwise need five extra
 * aggregate endpoints.
 */
export default function Students() {
  const { students, addStudent, editStudent, deleteStudent, bulkImport, bulkImportRows } =
    useData();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ------------------------------ filters ------------------------------ */
  const [department, setDepartment] = useState(searchParams.get('department') ?? 'ALL');
  const [year, setYear] = useState(searchParams.get('year') ?? 'ALL');
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [page, setPage] = useState(0);

  // 400ms of silence before the request goes out.
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, department, year]);

  // Keep the URL shareable/bookmarkable.
  useEffect(() => {
    const next = {};
    if (query.trim()) next.q = query.trim();
    if (department !== 'ALL') next.department = department;
    if (year !== 'ALL') next.year = year;
    setSearchParams(next, { replace: true });
  }, [query, department, year, setSearchParams]);

  /* ------------------------------- fetch ------------------------------- */
  const { data, loading, error, refetch } = useFetch(
    () =>
      studentService.getAll({
        page,
        size: PAGE_SIZE,
        search: debouncedQuery.trim(),
        department,
        year,
        // The table renders its own toast for validation problems, so let this
        // page decide how to present the failure.
        skipErrorToast: true,
      }),
    [page, debouncedQuery, department, year]
  );

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const hasFilters = Boolean(debouncedQuery.trim()) || department !== 'ALL' || year !== 'ALL';

  /* ------------------------ department tally cards ---------------------- */
  const counts = useMemo(
    () =>
      students.reduce(
        (acc, s) => ({ ...acc, [s.department]: (acc[s.department] ?? 0) + 1 }),
        {}
      ),
    [students]
  );

  /* ------------------------------- columns ------------------------------ */
  const columns = [
    {
      key: 'name',
      header: 'Student',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} photo={row.photo} department={row.department} size={38} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-bold text-ink dark:text-white">{row.name}</p>
            <p className="truncate font-mono text-[11px] text-muted">{row.rollNo}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: false,
      render: (row) => <DeptBadge code={row.department} />,
    },
    {
      key: 'year',
      header: 'Year / Section',
      sortable: false,
      render: (row) => (
        <span className="whitespace-nowrap text-[13px]">
          <span className="font-semibold text-ink dark:text-slate-100">{row.year}</span>
          <span className="text-muted"> · {row.section}</span>
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Contact',
      sortable: false,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-slate-600 dark:text-slate-300">{row.email}</p>
          {row.phone ? <p className="truncate text-[11px] text-slate-400">{row.phone}</p> : null}
        </div>
      ),
    },
    {
      key: 'gender',
      header: 'Gender',
      sortable: false,
      render: (row) => <span className="text-[12.5px] text-muted">{row.gender}</span>,
    },
    {
      key: 'createdAt',
      header: 'Added',
      sortable: false,
      render: (row) => (
        <span className="whitespace-nowrap text-[12px] text-muted">
          {formatDate(row.createdAt)}
        </span>
      ),
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
            aria-label={`Edit ${row.name}`}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-500/10"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleting(row)}
            aria-label={`Delete ${row.name}`}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  /* ------------------------------ mutations ----------------------------- */
  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await editStudent(editing.id, payload);
        toast.success(`${payload.name} updated.`);
      } else {
        await addStudent(payload);
        toast.success(`${payload.name} added to the register.`);
      }
      setFormOpen(false);
      setEditing(null);
      // A create/delete changes which rows belong on this page.
      refetch();
    } catch (err) {
      // The backend returns field-level `errors` for a bean-validation failure.
      const detail = err?.errors ? Object.values(err.errors).flat().join(' ') : null;
      toast.error(detail || err?.message || 'Could not save the student.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const target = deleting;
    try {
      await deleteStudent(target.id);
      toast.success(`${target.name} removed from the register.`);
      setDeleting(null);
      // Deleting the only row on the last page should walk us back a page.
      if (rows.length === 1 && page > 0) setPage((p) => p - 1);
      else refetch();
    } catch (err) {
      toast.error(err?.message || 'Could not delete the student.');
    }
  };

  /** Exports exactly what the server returned for the current page. */
  const handleExport = () => {
    if (!rows.length) {
      toast.warning('Nothing to export for this selection.');
      return;
    }
    exportService.toCsv(
      rows.map((s) => ({
        RollNo: s.rollNo,
        Name: s.name,
        Department: s.department,
        Year: s.year,
        Section: s.section,
        Email: s.email,
        Phone: s.phone ?? '',
      })),
      `students-page-${page + 1}`
    );
    toast.success(`Exported ${rows.length} students from page ${page + 1}.`);
  };

  const clearFilters = useCallback(() => {
    setQuery('');
    setDepartment('ALL');
    setYear('ALL');
  }, []);

  /* -------------------------------- render ------------------------------ */
  return (
    <DashboardLayout title="Students" subtitle="Examination Cell · Register">
      <PageHeader
        eyebrow="Register"
        icon={Users}
        title="Students"
        subtitle={`${total.toLocaleString('en-IN')} student${total === 1 ? '' : 's'} match the current filters across ${DEPARTMENTS.length} departments.`}
        actions={
          <>
            <Button variant="secondary" leftIcon={Download} onClick={handleExport}>
              Export page
            </Button>
            <Button variant="secondary" leftIcon={Upload} onClick={() => setUploadOpen(true)}>
              Bulk upload
            </Button>
            <Button
              leftIcon={UserPlus}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add student
            </Button>
          </>
        }
      />

      {/* quick stats — client-side tally of the full register */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DEPARTMENTS.slice(0, 4).map((dept) => (
          <motion.button
            key={dept.code}
            type="button"
            whileHover={{ y: -3 }}
            onClick={() => setDepartment(department === dept.code ? 'ALL' : dept.code)}
            className={cn(
              'flex items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-soft transition dark:bg-slate-900/60',
              department === dept.code
                ? 'border-primary-400 ring-2 ring-primary/20'
                : 'border-slate-200/80 dark:border-slate-800'
            )}
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white"
              style={{ background: `linear-gradient(135deg, ${dept.color}, ${dept.color}bb)` }}
            >
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-muted">{dept.name}</span>
              <span className="font-display text-xl font-extrabold text-ink dark:text-white">
                {counts[dept.code] ?? 0}
              </span>
            </span>
          </motion.button>
        ))}
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterBar
          value={query}
          onChange={setQuery}
          placeholder="Search name, roll no or email…"
          options={[
            { value: 'ALL', label: 'All departments', count: students.length },
            ...DEPARTMENTS.map((d) => ({
              value: d.code,
              label: d.code,
              count: counts[d.code] ?? 0,
              dot: d.color,
            })),
          ]}
        />

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">
            {[
              { value: 'ALL', label: 'All years' },
              ...YEARS.map((y) => ({ value: String(y.value), label: `Y${y.value}` })),
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setYear(option.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] font-bold transition',
                  year === option.value
                    ? 'bg-white text-primary-600 shadow-soft dark:bg-slate-900'
                    : 'text-slate-500 hover:text-ink dark:text-slate-400 dark:hover:text-white'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* fetch failure */}
      {error ? (
        <Card className="mb-4 border-rose-200 dark:border-rose-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="text-[13.5px] font-bold text-ink dark:text-white">
                  Could not load students
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

      <Table
        columns={columns}
        rows={rows}
        loading={loading}
        searchable={false}
        serverSide
        total={total}
        page={page}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        emptyIcon={Users}
        emptyTitle={hasFilters ? 'No matches' : 'No students yet'}
        emptyDescription={
          hasFilters
            ? 'Try clearing the search, department or year filter.'
            : 'Add students manually or bulk-upload the register from a CSV export.'
        }
        emptyAction={
          hasFilters ? (
            <Button size="sm" variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" leftIcon={UserPlus} onClick={() => setFormOpen(true)}>
                Add student
              </Button>
              <Button size="sm" variant="secondary" leftIcon={Upload} onClick={() => setUploadOpen(true)}>
                Bulk upload
              </Button>
            </div>
          )
        }
      />

      {/* footer legend */}
      <p className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <Mail className="h-3.5 w-3.5" />
        Showing {(rows.length ? page * PAGE_SIZE : 0) + (rows.length ? 1 : 0)}–
        {page * PAGE_SIZE + rows.length} of {total}
        {department !== 'ALL' ? (
          <>
            {' · '}
            <span className="font-semibold text-ink dark:text-white">
              {getDepartment(department).name}
            </span>
          </>
        ) : null}
        {year !== 'ALL' ? <> · Year {year}</> : null}
        {loading ? ' · fetching…' : ''}
      </p>

      <StudentFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        student={editing}
        saving={saving}
      />

      <BulkUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onImport={bulkImport}
        onImportRows={bulkImportRows}
        onDone={refetch}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete student?"
        description={`${deleting?.name} (${deleting?.rollNo}) will be removed from the register. Existing seating plans keep their record, but the student will not be allocated again.`}
        confirmLabel="Delete student"
      />
    </DashboardLayout>
  );
}

export { Students };
