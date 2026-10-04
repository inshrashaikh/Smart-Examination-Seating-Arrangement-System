import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Printer, Download, ArrowLeftRight, ShieldCheck, ShieldAlert, History,
  Send, Eye, Lock, RotateCcw, FileSpreadsheet, RefreshCw, Undo2, Redo2,
} from 'lucide-react';
import HallPlanGrid, { SeatLegend, ZoomControls, PlanStats, rowLabel } from './HallPlanGrid';
import ExplainPanel from './ExplainPanel';
import SeatFinderCard from './SeatFinderCard';
import Button from '../ui/Button';
import Badge, { StatusBadge } from '../ui/Badge';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Select from '../ui/Field';
import { useToast } from '../../context/ToastContext';
import { exportService, seatingService } from '../../services';
import useFetch from '../../hooks/useFetch';
import { formatDate, formatTimeRange, relativeTime } from '../../utils/format';
import cn from '../../utils/cn';

/**
 * Full hall-plan experience: selectors, search, zoom, swap, print, export,
 * verification summary and audit history. Read-only in faculty mode.
 */
export default function HallPlanViewer({
  mode = 'admin',
  plans = [],
  exams = [],
  halls = [],
  initialPlanId,
  /** Deep-link target from a scanned seat QR code, e.g. "A3". */
  initialSeat,
  onSwap,
  onPublish,
  busy = false,
  className,
}) {
  const toast = useToast();
  const [examId, setExamId] = useState('');
  const [hallId, setHallId] = useState('');
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [swapMode, setSwapMode] = useState(mode === 'admin');
  const [showHistory, setShowHistory] = useState(false);
  // Force a swap that skips the server's adjacency check — an escape hatch the
  // backend supports via `validate: false`, off by default.
  const [forceSwap, setForceSwap] = useState(false);
  /** Bumped after a mutation so the grid refetches from the server. */
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * Swap history for undo/redo.
   *
   * A swap is an involution on positions — exchanging the students at seats
   * A and B twice returns to the original layout — so an undo is performed by
   * swapping the same two positions again, not by storing grid snapshots.
   * Entries hold the seat references as they were at swap time (row/col);
   * the seats themselves never move, only the students do, so the stored
   * positions stay valid until the next mutation.
   */
  const [history, setHistory] = useState([]);
  const [cursor, setCursor] = useState(0);
  const canUndo = cursor > 0;
  const canRedo = cursor < history.length;

  // Switching plans starts a fresh history — entries name positions in the
  // grid that was current when they were recorded.
  useEffect(() => {
    setHistory([]);
    setCursor(0);
  }, [plan?.id]);

  const examsWithPlans = useMemo(() => {
    const ids = new Set(plans.map((p) => p.examId));
    return exams.filter((e) => ids.has(e.id));
  }, [exams, plans]);

  useEffect(() => {
    if (initialPlanId) {
      const target = plans.find((p) => p.id === initialPlanId);
      if (target) {
        setExamId(target.examId);
        setHallId(target.hallId);
      }
      return;
    }
    if (!examId && examsWithPlans.length) setExamId(examsWithPlans[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examsWithPlans, initialPlanId, plans]);

  // A scanned seat QR code arrives as ?seat=A3 — pre-fill the search so the
  // grid highlights the seat the code named.
  useEffect(() => {
    if (initialSeat) setQuery(initialSeat);
  }, [initialSeat]);

  const plansForExam = useMemo(
    () => plans.filter((p) => p.examId === examId),
    [plans, examId]
  );

  useEffect(() => {
    if (!plansForExam.length) {
      setHallId('');
      return;
    }
    if (!plansForExam.some((p) => p.hallId === hallId)) setHallId(plansForExam[0].hallId);
  }, [plansForExam, hallId]);

  /** The list entry — carries stats and verification but not the seat grid. */
  const summary = useMemo(
    () => plansForExam.find((p) => p.hallId === hallId) ?? null,
    [plansForExam, hallId]
  );

  /**
   * The grid itself.
   *
   * `DataContext.plans` holds only lightweight summaries (they power the
   * dashboard KPIs), so the full `HallPlanResponse` — including the `seats[][]`
   * matrix — is fetched per selection from `GET /api/seating/plans/{id}`.
   * That is also why a swap refetches rather than mutating local state: the
   * backend is the only authority on the resulting layout.
   */
  const {
    data: fetched,
    loading: planLoading,
    error: planError,
    refetch: refetchPlan,
  } = useFetch(
    () =>
      summary
        ? seatingService.getHallPlan(summary.id, { skipErrorToast: true })
        : Promise.resolve(null),
    [summary?.id, refreshKey],
    { immediate: true }
  );

  const plan = useMemo(() => {
    if (!summary) return null;
    // Keep the summary's fresher status if the fetch has not landed yet.
    if (!fetched) return summary.seats ? summary : { ...summary, seats: [] };
    return { ...summary, ...fetched, status: fetched.status ?? summary.status };
  }, [summary, fetched]);

  /** Seats matching the search box — powers the seat finder card. */
  const matchedSeats = useMemo(() => {
    if (!query.trim() || !plan?.seats) return [];
    const q = query.trim().toLowerCase();
    const out = [];
    plan.seats.forEach((row) =>
      row.forEach((seat) => {
        if (!seat?.studentId) return;
        if (
          String(seat.rollNo).toLowerCase().includes(q) ||
          String(seat.name).toLowerCase().includes(q) ||
          String(seat.label).toLowerCase() === q
        ) {
          out.push(seat);
        }
      })
    );
    return out;
  }, [query, plan]);

  const locateSeat = (seat) => {
    setSelected(seat);
    toast.info(`${seat.name} is at seat ${seat.label} — highlighted on the grid.`, { duration: 2600 });
  };

  /**
   * Runs a swap through the backend and records it for undo.
   *
   * `record: false` is used by undo/redo, which replay an existing entry
   * rather than append a new one. The grid always refetches from the server
   * afterwards — a swap can be rejected for creating a department clash, and
   * a guessed layout would be a lie.
   */
  const executeSwap = async (seatA, seatB, options = {}, record = true) => {
    if (!plan) return false;
    try {
      await onSwap?.(plan.id, seatA, seatB, { validate: options.validate });
      setRefreshKey((k) => k + 1);
      if (record) {
        setHistory((prev) => [...prev.slice(0, cursor), { a: seatA, b: seatB, validate: options.validate }]);
        setCursor((c) => c + 1);
      }
      return true;
    } catch (error) {
      // 409 from `assertSwapIsLegal` — show the backend's reason verbatim.
      toast.error(error?.message ?? 'Could not swap the seats.');
      return false;
    }
  };

  const handleSeatClick = async (seat) => {
    if (mode !== 'admin' || !plan) return;
    if (!selected) {
      setSelected(seat);
      toast.info(`Selected ${seat.name}. Now pick the seat to swap with.`, { duration: 2600 });
      return;
    }
    if (selected.row === seat.row && selected.col === seat.col) {
      setSelected(null);
      return;
    }
    const ok = await executeSwap(selected, seat, { validate: forceSwap ? false : undefined });
    if (ok) {
      toast.success(
        forceSwap
          ? `Forced swap of ${selected.name} with ${seat.name}. Constraints were not checked.`
          : `Swapped ${selected.name} with ${seat.name}. The change is recorded in the audit trail.`
      );
    }
    setSelected(null);
  };

  /** Undo replays the previous entry's swap in reverse — which, for a swap, is the same swap again. */
  const undo = async () => {
    if (!canUndo) return;
    const entry = history[cursor - 1];
    setCursor(cursor - 1);
    setSelected(null);
    const ok = await executeSwap(entry.a, entry.b, { validate: entry.validate }, false);
    if (ok) toast.info('Swap undone.');
  };

  const redo = async () => {
    if (!canRedo) return;
    const entry = history[cursor];
    setCursor(cursor + 1);
    setSelected(null);
    const ok = await executeSwap(entry.a, entry.b, { validate: entry.validate }, false);
    if (ok) toast.info('Swap redone.');
  };

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y) drive the history. Ignored
  // while typing so the browser's native text undo keeps working.
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        void undo();
      } else if ((event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y') {
        event.preventDefault();
        void redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUndo, canRedo, history, cursor, plan?.id]);

  /** Flattens the 2-D seat matrix into one row per occupied seat. */
  const seatRows = useCallback(() => {
    if (!plan?.seats) return [];
    const rows = [];
    plan.seats.forEach((row) =>
      row.forEach((seat) => {
        if (!seat?.studentId) return;
        rows.push({
          Seat: seat.label || `${rowLabel(seat.row)}${seat.col + 1}`,
          'Roll No': seat.rollNo,
          Name: seat.name,
          Department: seat.department,
          Year: seat.year ?? '',
          Section: seat.section ?? '',
          Gender: seat.gender ?? '',
          Hall: plan.hallName ?? '',
          Exam: plan.examCode ?? '',
        });
      })
    );
    return rows;
  }, [plan]);

  const handleExportCsv = () => {
    const rows = seatRows();
    if (!rows.length) {
      toast.warning('This plan has no allocated seats to export.');
      return;
    }
    exportService.toCsv(rows, `hall-plan-${plan?.hallCode}-${plan?.examCode}`);
    toast.success(`${rows.length} seats downloaded as CSV.`);
  };

  const handleExportExcel = () => {
    const rows = seatRows();
    if (!rows.length) {
      toast.warning('This plan has no allocated seats to export.');
      return;
    }
    exportService.toExcel(rows, `hall-plan-${plan?.hallCode}-${plan?.examCode}`);
    toast.success(`${rows.length} seats downloaded as Excel.`);
  };

  if (!plans.length) {
    return (
      <Card className={className}>
        <EmptyState
          icon={Search}
          title="No seating plans yet"
          description="Generate a seating plan from the Generate Seating wizard and it will appear here instantly."
        />
      </Card>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* ---------------- header / selectors ---------------- */}
      <Card className="print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Select
              label="Exam"
              value={examId}
              onChange={(e) => {
                setExamId(e.target.value);
                setSelected(null);
              }}
              options={examsWithPlans.map((e) => ({
                value: e.id,
                label: `${e.code} · ${e.title} (${formatDate(e.date)})`,
              }))}
            />
            <Select
              label="Hall"
              value={hallId}
              onChange={(e) => {
                setHallId(e.target.value);
                setSelected(null);
              }}
              options={plansForExam.map((p) => ({
                value: p.hallId,
                label: `${p.hallName} · ${p.stats.allocated} seats`,
              }))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ZoomControls zoom={zoom} onChange={setZoom} />
            {mode === 'admin' ? (
              <>
                <Button
                  variant={swapMode ? 'primary' : 'secondary'}
                  size="sm"
                  leftIcon={ArrowLeftRight}
                  onClick={() => {
                    setSwapMode((v) => !v);
                    setSelected(null);
                  }}
                >
                  {swapMode ? 'Swap mode on' : 'Swap mode'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={Undo2}
                  disabled={!canUndo}
                  onClick={() => void undo()}
                  title="Undo last swap (Ctrl+Z)"
                >
                  Undo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={Redo2}
                  disabled={!canRedo}
                  onClick={() => void redo()}
                  title="Redo swap (Ctrl+Shift+Z)"
                >
                  Redo
                </Button>
              </>
            ) : null}
            <Button variant="secondary" size="sm" leftIcon={Printer} onClick={() => exportService.toPdf(`Hall Plan ${plan?.hallCode ?? ''}`)}>
              Print / PDF
            </Button>
            <Button variant="secondary" size="sm" leftIcon={Download} onClick={handleExportCsv}>
              CSV
            </Button>
            <Button variant="secondary" size="sm" leftIcon={FileSpreadsheet} onClick={handleExportExcel}>
              Excel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={RefreshCw}
              loading={planLoading}
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              Refresh
            </Button>
            {mode === 'admin' && onPublish ? (
              <Button
                size="sm"
                leftIcon={Send}
                loading={busy}
                disabled={plan?.status === 'PUBLISHED'}
                onClick={async () => {
                  try {
                    await onPublish(plan.id);
                    toast.success('Hall plan published to faculty.');
                  } catch (error) {
                    toast.error(error?.message ?? 'Could not publish the plan.');
                  }
                }}
              >
                {plan?.status === 'PUBLISHED' ? 'Published' : 'Publish'}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a roll number or name…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-9 text-sm text-ink placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {mode === 'admin' ? (
              <>
                <SeatLegend counts={plan?.stats.departments} />
                <label
                  className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted hover:text-ink dark:hover:text-white"
                  title="Skips the server's adjacency check for the next swap. Recorded in the audit trail."
                >
                  <input
                    type="checkbox"
                    checked={forceSwap}
                    onChange={(e) => setForceSwap(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  Force swap
                </label>
                <Button variant="ghost" size="sm" leftIcon={History} onClick={() => setShowHistory((v) => !v)}>
                  History
                </Button>
              </>
            ) : (
              <Badge tone="info" dot>
                <Lock className="h-3 w-3" /> Read-only view
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* ---------------- seat finder result ---------------- */}
      {plan && matchedSeats.length === 1 ? (
        <SeatFinderCard plan={plan} seat={matchedSeats[0]} onLocate={locateSeat} />
      ) : null}
      {plan && matchedSeats.length > 1 ? (
        <p className="text-[12px] font-medium text-amber-600 dark:text-amber-400">
          {matchedSeats.length} seats match “{query}” — refine the search to pinpoint one.
        </p>
      ) : null}

      {/* ---------------- fetch failure ---------------- */}
      {planError ? (
        <Card className="border-rose-200 dark:border-rose-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="text-[13.5px] font-bold text-ink dark:text-white">
                  Could not load the seat grid
                </p>
                <p className="text-[12px] text-muted">{planError.message}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" leftIcon={RefreshCw} onClick={refetchPlan}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {/* ---------------- plan summary (printable) ---------------- */}
      {plan ? (
        <Card className="print-area">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-extrabold text-ink dark:text-white">{plan.hallName}</h2>
                <StatusBadge status={plan.status} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {plan.examCode} · {plan.examTitle} · {formatDate(plan.date)} ·{' '}
                {formatTimeRange(plan.startTime, plan.endTime)}
              </p>
            </div>

            <div className="text-right">
              <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">Plan ID</p>
              <p className="font-mono text-sm font-bold text-ink dark:text-white">{plan.id}</p>
              <p className="mt-1 text-[11px] text-muted">
                {plan.rows} rows × {plan.cols} columns
              </p>
            </div>
          </div>

          <div className="mt-4">
            <PlanStats plan={plan} />
          </div>

          {plan.verification?.isClean ? (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Verified — no duplicate students and no same-department adjacency violations.
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4" />
              {plan.verification?.adjacentSameDept ?? 0} adjacent same-department seat(s) detected. Swap them or
              re-generate with stricter rules.
            </div>
          )}

          <div className="mt-5">
            {planLoading && !plan.seats?.length ? (
              <PlanSkeleton />
            ) : (
              <HallPlanGrid
                plan={plan}
                seatSize={Math.round(46 * zoom)}
                editable={mode === 'admin' && swapMode}
                selected={selected}
                onSeatClick={handleSeatClick}
                highlight={query}
                animate={false}
              />
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-[11px] text-muted dark:border-slate-800">
            <p>
              Generated {relativeTime(plan.createdAt)}
              {plan.publishedAt ? ` · published ${relativeTime(plan.publishedAt)}` : ''} ·{' '}
              {(plan.history?.length ?? 0)} audit entr{(plan.history?.length ?? 0) === 1 ? 'y' : 'ies'}
            </p>
            <p className="font-mono">Seating Plan · SeatPlan Examination System</p>
          </div>

          {/* printable roster */}
          <details className="mt-4 hidden print:block">
            <summary className="mb-2 text-xs font-bold uppercase tracking-wider">Student roster</summary>
            <table className="w-full text-[10px]">
              <thead>
                <tr>
                  <th className="border px-1 py-1 text-left">Seat</th>
                  <th className="border px-1 py-1 text-left">Roll No</th>
                  <th className="border px-1 py-1 text-left">Name</th>
                  <th className="border px-1 py-1 text-left">Dept</th>
                </tr>
              </thead>
              <tbody>
                {plan.seats.flat().filter((s) => s.studentId).map((seat) => (
                  <tr key={seat.allocationId ?? `${seat.row}-${seat.col}`}>
                    <td className="border px-1 py-0.5">{seat.label}</td>
                    <td className="border px-1 py-0.5">{seat.rollNo}</td>
                    <td className="border px-1 py-0.5">{seat.name}</td>
                    <td className="border px-1 py-0.5">{seat.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={Eye}
            title="Select a hall to view its plan"
            description="Choose an exam and a hall from the selectors above."
          />
        </Card>
      )}

      {/* ---------------- explain this allocation ---------------- */}
      {plan ? <ExplainPanel plan={plan} selected={selected} /> : null}

      {/* ---------------- audit history ---------------- */}
      <AnimatePresence>
        {showHistory && plan ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white">
                <History className="h-4 w-4 text-primary-500" /> Audit trail · {plan.hallName}
              </h3>
              <ol className="mt-4 space-y-3">
                {(plan.history ?? []).map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-white">{entry.action}</p>
                      <p className="text-xs text-muted">
                        {entry.detail} · {relativeTime(entry.at)}
                      </p>
                    </div>
                  </li>
                ))}
                {!plan.history?.length ? (
                  <li className="text-sm text-muted">No changes recorded yet.</li>
                ) : null}
              </ol>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Placeholder grid shown while `GET /api/seating/plans/{id}` is in flight.
 * Mirrors the real layout (aisle gap every few rows) so the page does not jump
 * when the data lands.
 */
function PlanSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800" aria-busy="true">
      <div className="mb-4 h-3 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {Array.from({ length: 6 }).map((__, colIndex) => (
              <motion.div
                key={colIndex}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.65, 0.3] }}
                transition={{
                  duration: 1.3,
                  repeat: Infinity,
                  delay: (rowIndex * 6 + colIndex) * 0.035,
                }}
                className="h-9 flex-1 rounded-lg bg-slate-200 dark:bg-slate-800"
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] font-semibold text-muted">Loading seat assignments…</p>
    </div>
  );
}

export { HallPlanViewer };
