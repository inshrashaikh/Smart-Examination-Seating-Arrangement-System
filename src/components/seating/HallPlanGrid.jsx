import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Minus, Plus, Maximize2, AlertTriangle } from 'lucide-react';
import { getDepartment } from '../../data/departments';
import { Tooltip } from '../ui/Tooltip';
import Button from '../ui/Button';
import cn from '../../utils/cn';

const rowLabel = (index) => String.fromCharCode(65 + index);

/**
 * Interactive seating grid.
 *
 * @param {object}   plan         seating plan (rows, cols, seats[][])
 * @param {number}   seatSize     px per seat
 * @param {boolean}  editable     allows click-to-select seats
 * @param {Function} onSeatClick  (seat) => void
 * @param {object}   selected     currently selected seat
 * @param {string}   highlight    roll number / name to emphasise
 * @param {boolean}  animate      stagger seat entrance animation
 */
export default function HallPlanGrid({
  plan,
  seatSize = 44,
  editable = false,
  onSeatClick,
  selected,
  highlight = '',
  animate = true,
  showCoordinates = true,
  aisleAfter = 3,
  showConflicts = true,
  className,
}) {
  const [hovered, setHovered] = useState(null);
  const highlightQuery = highlight.trim().toLowerCase();

  const isMatchSeat = useMemo(() => {
    if (!highlightQuery) return () => false;
    return (seat) =>
      Boolean(seat?.studentId) &&
      (String(seat.rollNo).toLowerCase().includes(highlightQuery) ||
        String(seat.name).toLowerCase().includes(highlightQuery));
  }, [highlightQuery]);

  /**
   * Seats that break a rule, computed with the same orthogonal rule the
   * backend's `verify()` uses: a seat is conflicting when any of its four
   * orthogonal neighbours is occupied by a student from the same department.
   * Duplicate student ids (the same student seated twice) are flagged too —
   * that is the `clashes` half of verification.
   *
   * The backend reports only the *count* of violating pairs, so the grid
   * cannot mark the offending seats without recomputing; this mirrors
   * `SeatingAlgorithm.verify` exactly (right + down edges, orthogonal only).
   */
  const conflictKeys = useMemo(() => {
    const bad = new Set();
    const grid = plan?.seats;
    if (!grid) return bad;
    const seen = new Map(); // studentId -> first "row-col"
    for (let r = 0; r < grid.length; r += 1) {
      for (let c = 0; c < (grid[r]?.length ?? 0); c += 1) {
        const seat = grid[r][c];
        if (!seat?.studentId || seat.blocked) continue;

        const key = `${r}-${c}`;
        const first = seen.get(seat.studentId);
        if (first !== undefined) {
          bad.add(key);
          bad.add(first);
        } else {
          seen.set(seat.studentId, key);
        }

        for (const [nr, nc] of [[r, c + 1], [r + 1, c]]) {
          const neighbour = grid[nr]?.[nc];
          if (!neighbour?.studentId || neighbour.blocked) continue;
          if (neighbour.department === seat.department) {
            bad.add(key);
            bad.add(`${nr}-${nc}`);
          }
        }
      }
    }
    return bad;
  }, [plan]);

  if (!plan) return null;

  const gap = Math.max(4, Math.round(seatSize * 0.16));
  const labelWidth = seatSize + 6;
  const marginFor = (colIndex) =>
    colIndex === 0 ? 0 : gap + (colIndex % aisleAfter === 0 ? gap : 0);

  const anyHighlighted = highlightQuery
    ? plan.seats.some((row) => row.some((s) => isMatchSeat(s)))
    : true;

  return (
    <div className={cn('relative', className)}>
      <div className="mb-3">
        <div className="rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 dark:text-slate-300">
          Front of the hall · Invigilator desk
        </div>
      </div>

      <div className="overflow-auto scrollbar-thin pb-2">
        <div className="min-w-fit">
          {showCoordinates ? (
            <div className="flex">
              <div style={{ width: labelWidth }} />
              {plan.seats[0]?.map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="text-center text-[10px] font-bold text-slate-400"
                  style={{ width: seatSize, marginLeft: marginFor(colIndex) }}
                >
                  {colIndex + 1}
                </div>
              ))}
            </div>
          ) : null}

          {plan.seats.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="flex items-center"
              style={{ marginTop: rowIndex === 0 ? gap : 0 }}
            >
              <span
                className="grid shrink-0 place-items-center text-[11px] font-extrabold text-slate-400"
                style={{ width: labelWidth, height: seatSize }}
              >
                {rowLabel(rowIndex)}
              </span>

              {row.map((seat, colIndex) => {
                const dept = seat.department ? getDepartment(seat.department) : null;
                const isSelected = selected && selected.row === seat.row && selected.col === seat.col;
                const isMatch = isMatchSeat(seat);
                const isConflict = Boolean(showConflicts) && conflictKeys.has(`${rowIndex}-${colIndex}`);
                const dimmed = Boolean(highlightQuery) && !isMatch;

                return (
                  <div
                    key={seat.id ?? `${rowIndex}-${colIndex}`}
                    style={{ width: seatSize, height: seatSize, marginLeft: marginFor(colIndex) }}
                  >
                    <motion.button
                      type="button"
                      disabled={!editable || seat.blocked || !seat.studentId}
                      onClick={() => onSeatClick?.(seat)}
                      onMouseEnter={() => setHovered(seat)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(seat)}
                      onBlur={() => setHovered(null)}
                      whileHover={editable && !seat.blocked && seat.studentId ? { scale: 1.1, zIndex: 5 } : undefined}
                      initial={animate ? { scale: 0.4, opacity: 0 } : false}
                      animate={{ scale: 1, opacity: dimmed ? 0.32 : 1 }}
                      transition={{
                        duration: 0.3,
                        delay: animate ? Math.min((rowIndex * plan.cols + colIndex) * 0.008, 0.9) : 0,
                        ease: 'backOut',
                      }}
                      aria-label={
                        seat.blocked
                          ? `Seat ${rowLabel(rowIndex)}${colIndex + 1} blocked`
                          : seat.studentId
                            ? `${seat.name}, roll ${seat.rollNo}, seat ${rowLabel(rowIndex)}${colIndex + 1}${isConflict ? ' — conflicts with a same-department neighbour' : ''}`
                            : `Seat ${rowLabel(rowIndex)}${colIndex + 1} empty`
                      }
                      className={cn(
                        'relative grid h-full w-full place-items-center overflow-hidden rounded-lg text-[10px] font-bold transition-colors',
                        seat.blocked
                          ? 'cursor-not-allowed border border-dashed border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800/70'
                          : seat.studentId
                            ? 'text-white shadow-sm'
                            : 'border border-dashed border-slate-200 bg-white/60 text-slate-300 dark:border-slate-700 dark:bg-slate-900/40',
                        isSelected && 'ring-2 ring-primary-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
                        isMatch && !isSelected && 'ring-2 ring-amber-400',
                        // Conflict marking wins over the search highlight: a
                        // violating seat must stay visible while a search dims
                        // the rest of the grid.
                        isConflict && 'ring-2 ring-rose-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900'
                      )}
                      style={
                        seat.studentId && !seat.blocked
                          ? { background: `linear-gradient(135deg, ${dept.color}, ${dept.color}dd)` }
                          : undefined
                      }
                    >
                      {seat.blocked ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        <>
                          {showCoordinates ? (
                            <span className="leading-none drop-shadow-sm">
                              {rowLabel(rowIndex)}
                              {colIndex + 1}
                            </span>
                          ) : null}
                          {isMatch ? <span className="absolute inset-x-1 bottom-1 h-0.5 rounded-full bg-amber-300" /> : null}
                          {isConflict ? (
                            <span className="absolute right-0.5 top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-rose-500 text-white shadow-sm">
                              <AlertTriangle className="h-2.5 w-2.5" strokeWidth={3} />
                            </span>
                          ) : null}
                        </>
                      )}
                    </motion.button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {hovered && !hovered.blocked && hovered.studentId ? (
          <SeatHoverCard seat={hovered} />
        ) : null}
      </AnimatePresence>

      {highlightQuery && !anyHighlighted ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Search className="h-3.5 w-3.5" /> No seat matches “{highlight}”
        </p>
      ) : null}

      {showConflicts && conflictKeys.size > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {conflictKeys.size} seat{conflictKeys.size === 1 ? '' : 's'} break
          {conflictKeys.size === 1 ? 's' : ''} a same-department adjacency or duplicate rule — marked with a red ring.
        </p>
      ) : null}
    </div>
  );
}

function SeatHoverCard({ seat }) {
  const dept = getDepartment(seat.department);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.14 }}
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-72 -translate-x-1/2 rounded-2xl border border-slate-700/60 bg-slate-900 p-4 text-left shadow-soft-lg"
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white"
          style={{ background: dept.color }}
        >
          {String(seat.rollNo).slice(-3)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{seat.name}</p>
          <p className="font-mono text-[11px] text-slate-400">{seat.rollNo}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: `${dept.color}44` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: dept.color }} />
          {dept.name}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-200">
          Year {seat.year} · Sec {seat.section}
        </span>
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-400">
        Seat {rowLabel(seat.row)}
        {seat.col + 1}
      </p>
    </motion.div>
  );
}

/** Department colour legend with optional live counts. */
export function SeatLegend({ counts, className, compact = false }) {
  const entries = counts
    ? Object.entries(counts).map(([code, value]) => ({ code, value }))
    : ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL'].map((code) => ({ code, value: null }));

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {entries.map(({ code, value }) => {
        const dept = getDepartment(code);
        return (
          <span
            key={code}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: dept.color }} />
            {dept.short}
            {value !== null && !compact ? (
              <span className="font-bold text-ink dark:text-white">{value}</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

/** Zoom control cluster used by both admin and faculty viewers. */
export function ZoomControls({ zoom, onChange, className }) {
  const clamp = (value) => Math.min(1.6, Math.max(0.6, Number(value.toFixed(2))));
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900',
        className
      )}
    >
      <Tooltip content="Zoom out">
        <Button variant="ghost" size="iconSm" onClick={() => onChange(clamp(zoom - 0.15))} aria-label="Zoom out">
          <Minus className="h-4 w-4" />
        </Button>
      </Tooltip>
      <span className="w-12 text-center font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
        {Math.round(zoom * 100)}%
      </span>
      <Tooltip content="Zoom in">
        <Button variant="ghost" size="iconSm" onClick={() => onChange(clamp(zoom + 0.15))} aria-label="Zoom in">
          <Plus className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip content="Reset zoom">
        <Button variant="ghost" size="iconSm" onClick={() => onChange(1)} aria-label="Reset zoom">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </Tooltip>
    </div>
  );
}

/** Verification + allocation summary strip. */
export function PlanStats({ plan, className }) {
  if (!plan) return null;
  const { verification, stats } = plan;
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      <Metric label="Allocated" value={`${stats.allocated}/${stats.capacity}`} tone="primary" />
      <Metric label="Utilisation" value={`${stats.utilisation}%`} tone="accent" />
      <Metric label="Clashes" value={verification.clashes} tone={verification.clashes ? 'rose' : 'emerald'} />
      <Metric
        label="Adjacency issues"
        value={verification.adjacentSameDept}
        tone={verification.adjacentSameDept ? 'amber' : 'emerald'}
      />
    </div>
  );
}

function Metric({ label, value, tone = 'primary' }) {
  const tones = {
    primary: 'text-primary-600 dark:text-primary-300',
    accent: 'text-accent-600 dark:text-accent-300',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    rose: 'text-rose-600 dark:text-rose-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/60">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn('mt-0.5 font-display text-lg font-extrabold', tones[tone])}>{value}</p>
    </div>
  );
}

export { rowLabel };

export { HallPlanGrid };
