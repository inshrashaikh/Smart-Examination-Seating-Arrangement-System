import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  History, RefreshCw, Search, ChevronLeft, ChevronRight, Inbox,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge, { Avatar } from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Field';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { auditService, SEARCH_DEBOUNCE_MS } from '../../services';
import useDebounce from '../../hooks/useDebounce';
import { relativeTime } from '../../utils/format';

/** Action families shown as filter options, in display order. */
const ACTION_FILTERS = [
  { value: 'ALL', label: 'All actions' },
  { value: 'seating', label: 'Seating plans' },
  { value: 'duty', label: 'Duties' },
  { value: 'attendance', label: 'Attendance' },
];

/**
 * Audit trail — a read-only, admin-only log of everything the system has
 * done. Entries are written by the backend at the moment an action happens
 * (generate, swap, publish, reset, duty assign/remove/status, attendance
 * saved), so this page only reads and filters them.
 */
export default function Audit() {
  const toast = useToast();

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await auditService.page({ page, size });
      setData(result);
    } catch (err) {
      setError(err);
      toast.error(err?.message ?? 'Could not load the audit trail.');
    } finally {
      setLoading(false);
    }
  }, [page, size, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    let items = data.items ?? [];
    if (actionFilter !== 'ALL') {
      items = items.filter((row) => row.action?.startsWith(actionFilter));
    }
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (row) =>
          row.action?.toLowerCase().includes(q) ||
          row.detail?.toLowerCase().includes(q) ||
          row.actor?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [data.items, actionFilter, debouncedSearch]);

  const columns = [
    {
      key: 'action',
      header: 'Action',
      sortable: false,
      render: (row) => <ActionBadge action={row.action} />,
    },
    {
      key: 'detail',
      header: 'Detail',
      sortable: false,
      render: (row) => (
        <p className="max-w-[420px] truncate text-[12.5px] text-slate-600 dark:text-slate-300" title={row.detail}>
          {row.detail}
        </p>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      sortable: false,
      render: (row) => (
        <span className="flex items-center gap-2">
          <Avatar name={row.actor} size={26} />
          <span className="whitespace-nowrap text-[12px] font-semibold text-ink dark:text-slate-100">
            {row.actor}
          </span>
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'When',
      sortable: false,
      render: (row) => (
        <span className="whitespace-nowrap text-[11.5px] text-muted">{relativeTime(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <DashboardLayout title="Audit Trail" subtitle="Examination Cell · Every action, on record">
      <PageHeader
        eyebrow="Audit trail"
        icon={History}
        title="Audit trail"
        subtitle="Every plan generation, swap, publication and duty change — who did what, and when."
        breadcrumb={[{ label: 'Examination Cell', to: '/admin' }, { label: 'Audit Trail' }]}
        actions={
          <Button variant="ghost" leftIcon={RefreshCw} onClick={load} loading={loading}>
            Refresh
          </Button>
        }
      />

      {/* ---------------- filter bar ---------------- */}
      <Card className="mb-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the detail, actor or action…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm text-ink placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
            />
          </div>
          <Select
            label="Action family"
            value={actionFilter}
            onChange={setActionFilter}
            options={ACTION_FILTERS}
          />
        </div>
      </Card>

      {/* ---------------- table ---------------- */}
      {error ? (
        <Card className="border-rose-200 dark:border-rose-500/30">
          <EmptyState
            icon={History}
            title="Could not load the audit trail"
            description={error.message}
            action={<Button variant="secondary" leftIcon={RefreshCw} onClick={load}>Retry</Button>}
          />
        </Card>
      ) : loading && !data.items.length ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : !rows.length ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title="No audit entries"
            description="Actions like generating a plan, swapping seats or assigning duties are recorded here automatically."
            action={
              <Button as={Link} to="/admin/generate" variant="secondary" leftIcon={History}>
                Generate a plan
              </Button>
            }
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <Table
            columns={columns}
            rows={rows}
            loading={loading}
            rowKey={(row) => row.id}
            searchable={false}
            emptyIcon={Inbox}
            emptyTitle="No entries match"
            emptyDescription="Adjust the search or action filter."
            footer={
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <p className="text-[11.5px] text-muted">
                  Page {data.page} of {data.totalPages} · {data.total} entr{data.total === 1 ? 'y' : 'ies'} total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={ChevronLeft}
                    disabled={page <= 0 || loading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={ChevronRight}
                    disabled={page + 1 >= data.totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            }
          />
        </Card>
      )}
    </DashboardLayout>
  );
}

/** Colour-codes an action family at a glance. */
function ActionBadge({ action }) {
  const value = action ?? '';
  const tone = value.startsWith('seating.generate')
    ? 'primary'
    : value.startsWith('seating.swap')
      ? 'info'
      : value.startsWith('seating.publish')
        ? 'success'
        : value.startsWith('seating.reset')
          ? 'warning'
          : value.startsWith('duty')
            ? 'violet'
            : value.startsWith('attendance')
              ? 'accent'
              : 'slate';
  return <Badge tone={tone} size="sm">{value}</Badge>;
}

export { Audit };
