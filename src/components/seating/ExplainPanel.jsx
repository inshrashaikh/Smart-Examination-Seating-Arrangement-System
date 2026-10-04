import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ShieldCheck, ShieldAlert, Users, Armchair, ArrowRight } from 'lucide-react';
import { getDepartment } from '../../data/departments';
import { rowLabel } from './HallPlanGrid';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import cn from '../../utils/cn';

const ORTHOGONAL = [[0, -1, 'left'], [-1, 0, 'front'], [1, 0, 'back'], [0, 1, 'right']];
const DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

/**
 * Explain-allocation panel.
 *
 * Answers the two questions an examiner actually asks about a generated plan:
 *
 *  1. **Why this plan?** — how the departments were spread across the halls and
 *     what the verification pass found. Computed from the plan's own stats and
 *     verification payload, so it always describes the grid on screen.
 *
 *  2. **Why this seat?** — for the currently selected seat, the neighbour
 *     analysis the engine used when it placed that student: which departments
 *     sit around them and whether the placement honours the anti-cheating
 *     rules. This is the same orthogonal/diagonal neighbourhood
 *     `SeatingAlgorithm.verify` walks, rendered per seat.
 *
 * Everything is derived client-side from the `HallPlanResponse` the viewer
 * already holds — no extra request, and the explanation can never disagree
 * with the grid it describes.
 */
export default function ExplainPanel({ plan, selected, rules, className }) {
  const seatAnalysis = useMemo(() => analyseSeat(plan, selected), [plan, selected]);

  if (!plan) return null;

  const { verification, stats } = plan;
  const departments = stats?.departments ?? {};

  return (
    <div className={cn('space-y-5', className)}>
      {/* ---------------- why this plan ---------------- */}
      <Card>
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white">
          <Info className="h-4 w-4 text-primary-500" /> Why this plan
        </h3>

        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          The engine filled {plan.hallName} row by row, picking for each seat the department with the
          most students remaining that does not clash with its neighbours. The result is the grid on
          screen — nothing here is a separate calculation.
        </p>

        {/* department spread */}
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Department spread
          </p>
          <div className="space-y-2">
            {Object.entries(departments).length ? (
              Object.entries(departments).map(([code, count]) => {
                const dept = getDepartment(code);
                const total = Object.values(departments).reduce((a, b) => a + b, 0);
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={code} className="flex items-center gap-3">
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-extrabold text-white"
                      style={{ background: dept.color }}
                    >
                      {dept.short}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: dept.color }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right font-mono text-[11px] font-bold text-ink dark:text-white">
                      {count} · {pct}%
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-[12px] text-muted">No students were seated in this hall.</p>
            )}
          </div>
        </div>

        {/* verification summary */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Badge tone={verification?.isClean ? 'success' : 'warning'} dot>
            {verification?.isClean ? 'Verified clean' : 'Needs attention'}
          </Badge>
          <Badge tone="slate">
            <Users className="h-3 w-3" /> {stats?.allocated}/{stats?.capacity} seated
          </Badge>
          <Badge tone="slate">
            <Armchair className="h-3 w-3" /> {stats?.utilisation}% utilised
          </Badge>
          {verification?.clashes > 0 ? (
            <Badge tone="danger">{verification.clashes} duplicate(s)</Badge>
          ) : null}
          {verification?.adjacentSameDept > 0 ? (
            <Badge tone="warning">{verification.adjacentSameDept} adjacency pair(s)</Badge>
          ) : null}
        </div>

        {rules && Object.keys(rules).length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(rules).map(([key, value]) => (
              <Badge key={key} tone={value ? 'primary' : 'slate'} size="sm">
                {key}
              </Badge>
            ))}
          </div>
        ) : null}
      </Card>

      {/* ---------------- why this seat ---------------- */}
      <AnimatePresence mode="wait">
        {selected && seatAnalysis ? (
          <motion.div
            key={`${selected.row}-${selected.col}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Card>
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white">
                Why is {selected.name} at seat {seatAnalysis.label}?
              </h3>

              <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white"
                  style={{ background: seatAnalysis.deptColor }}
                >
                  {String(selected.rollNo).slice(-3)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-ink dark:text-white">{selected.name}</p>
                  <p className="font-mono text-[11px] text-muted">
                    {selected.rollNo} · {selected.department} · Year {selected.year}
                  </p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                <span className="rounded-lg bg-white px-2.5 py-1 font-mono text-[12px] font-extrabold text-ink shadow-sm dark:bg-slate-900 dark:text-white">
                  {seatAnalysis.label}
                </span>
              </div>

              {/* neighbour analysis */}
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Neighbourhood the engine checked
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {seatAnalysis.neighbours.map((n) => (
                    <div
                      key={n.where}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px]',
                        n.sameDept
                          ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
                          : 'border-slate-200 dark:border-slate-700'
                      )}
                    >
                      <span className="font-mono text-[10px] font-bold uppercase text-slate-400">
                        {n.where}
                      </span>
                      {n.seat ? (
                        <>
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: n.color }}
                          />
                          <span className="truncate font-semibold text-ink dark:text-slate-100">
                            {n.seat.name}
                          </span>
                          {n.sameDept ? (
                            <ShieldAlert className="ml-auto h-3.5 w-3.5 shrink-0 text-rose-500" />
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted">empty</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* rule verdict */}
              <div
                className={cn(
                  'mt-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[12.5px] font-medium',
                  seatAnalysis.legal
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                )}
              >
                {seatAnalysis.legal ? (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <p className="leading-relaxed">{seatAnalysis.verdict}</p>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-center text-[12px] text-muted dark:border-slate-700"
          >
            Click any occupied seat to see why the engine placed that student there.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Reconstructs the engine's placement reasoning for one seat: the orthogonal
 * neighbours it had to avoid and whether the final placement honours the
 * same-department adjacency rule. Mirrors the neighbourhood walk in
 * `SeatingAlgorithm.fillHall` / `verify`.
 */
function analyseSeat(plan, seat) {
  if (!plan?.seats || !seat?.studentId) return null;
  const grid = plan.seats;
  const r = seat.row;
  const c = seat.col;
  const dept = getDepartment(seat.department);

  const neighbours = ORTHOGONAL.map(([dr, dc, where]) => {
    const n = grid[r + dr]?.[c + dc];
    if (!n || n.blocked || !n.studentId) return { where, seat: null, sameDept: false, color: null };
    const nDept = getDepartment(n.department);
    return {
      where,
      seat: n,
      sameDept: n.department === seat.department,
      color: nDept.color,
    };
  });

  const sameDeptCount = neighbours.filter((n) => n.sameDept).length;
  const legal = sameDeptCount === 0;
  const occupied = neighbours.filter((n) => n.seat).length;

  const verdict = legal
    ? `No same-department neighbour on any of the ${occupied} occupied orthogonal side${occupied === 1 ? '' : 's'} — the placement honours the anti-cheating rules.`
    : `${sameDeptCount} same-department neighbour${sameDeptCount === 1 ? '' : 's'} beside this seat. The engine could not avoid it without breaking the hall's balance; swap the seat or re-generate with stricter rules.`;

  return {
    label: `${rowLabel(r)}${c + 1}`,
    deptColor: dept.color,
    neighbours,
    legal,
    verdict,
  };
}

export { ExplainPanel };
