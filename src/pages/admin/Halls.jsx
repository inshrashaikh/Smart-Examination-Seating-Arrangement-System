import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Plus, Pencil, Trash2, Users, Grid3x3, Snowflake, Fan, Projector,
  Monitor, Wifi, BatteryCharging, Clock, Volume2, Search,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { ProgressBar } from '../../components/ui/Progress';
import HallFormModal from '../../components/halls/HallFormModal';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { exportService } from '../../services';
import { formatNumber } from '../../utils/format';
import cn from '../../utils/cn';

const FACILITY_ICONS = {
  Projector,
  'Smart Board': Monitor,
  Fans: Fan,
  'Charging Points': BatteryCharging,
  'Wi-Fi': Wifi,
  Clock,
  'Audio System': Volume2,
};

export default function Halls() {
  const { halls, plans, addHall, editHall, deleteHall, helpers, loading } = useData();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [type, setType] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  // Rows the server has already confirmed — kept so a card can be painted in
  // place before the refetch lands.
  const [optimistic, setOptimistic] = useState({});

  const totalCapacity = helpers.totalCapacity;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return halls.filter((h) => {
      if (type !== 'ALL' && h.type !== type) return false;
      if (q && !`${h.name} ${h.code} ${h.block}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [halls, query, type]);

  const planStats = useMemo(() => {
    const map = {};
    plans.forEach((plan) => {
      const current = map[plan.hallId] ?? { allocated: 0, count: 0, latest: plan };
      current.allocated += plan.stats.allocated;
      current.count += 1;
      if (plan.date > current.latest.date) current.latest = plan;
      map[plan.hallId] = current;
    });
    return map;
  }, [plans]);

  /**
   * CRUD with optimistic feedback.
   *
   * The store is patched by `addHall`/`editHall`/`deleteHall` only after the
   * server answers, so `optimistic` is a purely visual layer that paints the
   * new state immediately and is cleared when the real data arrives. On a 4xx
   * the mutation throws before touching the store, and the flag is dropped, so
   * a rejected save can never leave a phantom hall on screen.
   */
  const handleSubmit = async (payload) => {
    setSaving(true);
    const key = editing?.id ?? 'new';
    setOptimistic((prev) => ({ ...prev, [key]: { ...payload, __pending: true } }));
    try {
      if (editing) {
        await editHall(editing.id, payload);
        toast.success(`${payload.name} updated.`);
      } else {
        await addHall(payload);
        toast.success(`${payload.name} added with ${payload.capacity} seats.`);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error?.message ?? 'Could not save the hall.');
    } finally {
      setSaving(false);
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleDelete = async () => {
    const target = deleting;
    setDeleting(null);
    try {
      await deleteHall(target.id);
      toast.success(`${target.name} removed.`);
    } catch (error) {
      // The backend refuses to delete a hall that still owns allocations.
      toast.error(error?.message ?? 'Could not delete the hall.');
    }
  };

  /** Applies a pending visual patch to a hall that has not been saved yet. */
  const display = (hall) => (optimistic[hall.id] ? { ...hall, ...optimistic[hall.id] } : hall);

  return (
    <DashboardLayout title="Halls & Rooms" subtitle="Examination Cell · Venues">
      <PageHeader
        eyebrow="Venues"
        icon={Building2}
        title="Halls & Rooms"
        subtitle={`${halls.length} halls mapped · ${formatNumber(totalCapacity)} seats available for allocation.`}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                exportService.toExcel(
                  halls.map((h) => ({
                    Code: h.code,
                    Name: h.name,
                    Block: h.block,
                    Floor: h.floor,
                    Type: h.type,
                    Rows: h.rows,
                    Columns: h.cols,
                    Capacity: h.capacity,
                    'Blocked Seats': (h.blockedSeats ?? []).length,
                  })),
                  'examination-halls'
                );
                toast.success('Hall list exported as Excel.');
              }}
            >
              Export list
            </Button>
            <Button
              leftIcon={Plus}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add hall
            </Button>
          </>
        }
      />

      {/* filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">
          {[
            { value: 'ALL', label: 'All halls' },
            { value: 'AC', label: 'Air conditioned' },
            { value: 'NON_AC', label: 'Non-AC' },
            { value: 'SEMINAR', label: 'Seminar' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold transition',
                type === option.value
                  ? 'bg-white text-primary-600 shadow-soft dark:bg-slate-900'
                  : 'text-slate-500 hover:text-ink dark:text-slate-400 dark:hover:text-white'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search halls or blocks…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-ink placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
          />
        </div>
      </div>

      {loading && halls.length === 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No halls match your filters"
            description="Adjust the search or add a new examination hall to the register."
            action={
              <Button
                leftIcon={Plus}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add hall
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((raw, index) => {
              const hall = display(raw);
              const stats = planStats[hall.id];
              const utilisation = stats
                ? Math.round((stats.allocated / Math.max(1, stats.count * hall.capacity)) * 100)
                : 0;
              const previewCols = Math.min(hall.cols, 8);
              const previewRows = Math.min(hall.rows, 6);

              return (
                <motion.div
                  key={hall.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                >
                  <Card hover className="group h-full">
                    {/* header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-glow">
                          <Building2 className="h-6 w-6" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-ink dark:text-white">{hall.name}</h3>
                          <p className="truncate text-xs text-muted">
                            {hall.block} · Floor {hall.floor}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(hall);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${hall.name}`}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-500/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(hall)}
                          aria-label={`Delete ${hall.name}`}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* mini seat map */}
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="mb-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div
                        className="grid gap-1"
                        style={{ gridTemplateColumns: `repeat(${previewCols}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: previewRows * previewCols }).map((_, i) => {
                          const row = Math.floor(i / previewCols);
                          const col = i % previewCols;
                          const blocked = (hall.blockedSeats ?? []).some(
                            (s) => s.row === row && s.col === col
                          );
                          return (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, scale: 0.6 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.15 + i * 0.008, duration: 0.25 }}
                              className={cn(
                                'aspect-square rounded-[3px]',
                                blocked
                                  ? 'border border-dashed border-slate-300 dark:border-slate-600'
                                  : 'bg-primary-300 dark:bg-primary-500/40'
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* metrics */}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Metric label="Capacity" value={hall.capacity} icon={Users} />
                      <Metric label="Rows" value={hall.rows} icon={Grid3x3} />
                      <Metric label="Cols" value={hall.cols} icon={Grid3x3} />
                    </div>

                    {/* badges */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Badge tone={hall.type === 'AC' ? 'sky' : 'slate'} dot>
                        {hall.type === 'AC' ? <Snowflake className="h-3 w-3" /> : <Fan className="h-3 w-3" />}
                        {hall.type === 'NON_AC' ? 'Non-AC' : hall.type}
                      </Badge>
                      <Badge tone="violet">{hall.board}</Badge>
                      {(hall.blockedSeats ?? []).length ? (
                        <Badge tone="warning">{hall.blockedSeats.length} blocked seat(s)</Badge>
                      ) : null}
                    </div>

                    {hall.facilities?.length ? (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {hall.facilities.map((facility) => {
                          const Icon = FACILITY_ICONS[facility] ?? Projector;
                          return (
                            <li
                              key={facility}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <Icon className="h-3 w-3" />
                              {facility}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}

                    {/* utilisation */}
                    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                      {stats ? (
                        <>
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className="text-muted">
                              {stats.count} plan{stats.count > 1 ? 's' : ''} · latest {stats.latest.examCode}
                            </span>
                            <span className="text-ink dark:text-slate-200">{utilisation}% utilised</span>
                          </div>
                          <ProgressBar
                            value={utilisation}
                            size="sm"
                            className="mt-1.5"
                            tone={utilisation > 90 ? 'emerald' : utilisation > 60 ? 'accent' : 'amber'}
                          />
                        </>
                      ) : (
                        <p className="flex items-center gap-1.5 text-[11px] text-muted">
                          <StatusBadge status="SCHEDULED" size="sm" /> No seating plan yet
                        </p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <HallFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        hall={editing}
        saving={saving}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete hall?"
        description={`${deleting?.name} (${deleting?.capacity} seats) will be removed from the venue register. Existing seating plans remain available for reports.`}
        confirmLabel="Delete hall"
      />
    </DashboardLayout>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2 text-center dark:border-slate-800 dark:bg-slate-900/50">
      <Icon className="mx-auto h-3.5 w-3.5 text-slate-400" />
      <p className="mt-0.5 font-display text-base font-extrabold text-ink dark:text-white">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

export { Halls };
