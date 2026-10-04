import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CalendarDays, Building2, SlidersHorizontal, CheckCircle2, ChevronRight,
  ChevronLeft, RotateCcw, ShieldCheck, Armchair, Users, AlertTriangle, Grid3x3,
  ArrowRight, Zap, Info, Check, Ban, MapPin, Wind, Snowflake,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge, { DeptBadge, StatusBadge } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Checkbox, Switch } from '../../components/ui/Field';
import { ProgressBar } from '../../components/ui/Progress';
import { SeatAllocationLoader, SuccessCheck, Confetti } from '../../components/ui/Spinner';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { seatingService } from '../../services';
import { RULE_CATALOG, DEFAULT_RULES } from '../../utils/seating';
import { formatDate, formatTimeRange } from '../../utils/format';
import cn from '../../utils/cn';

/* ------------------------------------------------------------------ *
 * Wizard configuration
 * ------------------------------------------------------------------ */
const STEPS = [
  { id: 1, label: 'Select exam', icon: CalendarDays },
  { id: 2, label: 'Choose halls', icon: Building2 },
  { id: 3, label: 'Set rules', icon: SlidersHorizontal },
  { id: 4, label: 'Generate', icon: Sparkles },
];

/**
 * Starting points for the rules step.
 *
 * Every key here must exist on the backend's `SeatingRulesRequest`. The Compact
 * preset previously spread a `balanceAcrossHalls: false`, which the server does
 * not declare — it was dropped without a word, so the preset behaved identically
 * to Balanced. `shuffle: false` is the real lever for "fill in roll order", and
 * `strictCapacity` is carried explicitly so the presets can never drift back
 * into the server's `409` default by omission.
 */
const RULE_PRESETS = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Mix departments and block same-department neighbours.',
    icon: Zap,
    rules: { ...DEFAULT_RULES },
  },
  {
    id: 'strict',
    label: 'Strict',
    description: 'Adds diagonal blocking and year separation.',
    icon: ShieldCheck,
    rules: { ...DEFAULT_RULES, avoidSameDeptAdjacent: true, avoidSameDeptDiagonal: true, avoidSameYearAdjacent: true },
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Fill in roll order with no clash-avoidance rules.',
    icon: Grid3x3,
    rules: {
      ...DEFAULT_RULES,
      mixDepartments: false,
      avoidSameDeptAdjacent: false,
      avoidSameDeptDiagonal: false,
      avoidSameYearAdjacent: false,
      shuffle: false,
    },
  },
];

const LOADING_STAGES = [
  { at: 0, label: 'Preparing student queues' },
  { at: 16, label: 'Shuffling departments deterministically' },
  { at: 34, label: 'Filling halls seat by seat' },
  { at: 56, label: 'Enforcing adjacency constraints' },
  { at: 76, label: 'Balancing hall utilisation' },
  { at: 92, label: 'Running clash verification' },
];

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */
export default function GenerateSeating() {
  const { exams, halls, students, plans, applyGeneration, publishPlan } = useData();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [examId, setExamId] = useState('');
  const [hallIds, setHallIds] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [phase, setPhase] = useState('form'); // form | allocating | done
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);
  const [publishing, setPublishing] = useState(false);

  // Auto-select the next exam that still needs a plan.
  useEffect(() => {
    if (examId || !exams.length) return;
    const pending =
      exams.find((e) => e.status !== 'COMPLETED' && !plans.some((p) => p.examId === e.id)) ??
      exams.find((e) => e.status !== 'COMPLETED') ??
      exams[0];
    setExamId(pending.id);
    setDepartments(pending.departments);
  }, [exams, examId, plans]);

  const exam = useMemo(() => exams.find((e) => e.id === examId) ?? null, [exams, examId]);

  const eligibleStudents = useMemo(() => {
    if (!exam) return [];
    return students.filter(
      (s) =>
        departments.includes(s.department) &&
        (!exam.years?.length || exam.years.includes(Number(s.year))) &&
        Number(s.year) >= Number(exam.minYear ?? 1)
    );
  }, [students, exam, departments]);

  const selectedHalls = useMemo(() => halls.filter((h) => hallIds.includes(h.id)), [halls, hallIds]);

  const usableSeats = useMemo(
    () =>
      selectedHalls.reduce(
        (sum, h) => sum + Math.max(0, h.rows * h.cols - (h.blockedSeats?.length ?? 0)),
        0
      ),
    [selectedHalls]
  );

  const existingPlans = useMemo(
    () => (examId ? plans.filter((p) => p.examId === examId) : []),
    [plans, examId]
  );

  const activeRules = useMemo(() => RULE_CATALOG.filter((r) => rules[r.key]).length, [rules]);

  const canContinue = step === 1 ? Boolean(exam) : step === 2 ? hallIds.length > 0 : true;
  const overflowExpected = usableSeats < eligibleStudents.length;

  const stageLabel =
    LOADING_STAGES.filter((s) => progress >= s.at).pop()?.label ?? LOADING_STAGES[0].label;

  /* ----------------------------- handlers ----------------------------- */
  const handleExamChange = (nextId) => {
    const next = exams.find((e) => e.id === nextId);
    setExamId(nextId);
    setDepartments(next?.departments ?? []);
    setHallIds([]);
  };

  const toggleHall = (id) => {
    setHallIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllHalls = () => setHallIds(halls.map((h) => h.id));
  const clearHalls = () => setHallIds([]);

  const toggleRule = (key, value) => setRules((prev) => ({ ...prev, [key]: value }));

  const resetWizard = () => {
    setStep(1);
    setPhase('form');
    setProgress(0);
    setResult(null);
    setFailure(null);
    setHallIds([]);
    setRules(DEFAULT_RULES);
  };

  /**
   * Runs the engine.
   *
   * `seatingService.generate` POSTs `{ examId, hallIds, departments, rules }` and
   * the backend replies with a `GenerateSeatingResponse`:
   *
   *   { examId, examCode, examTitle, totalSeated, unallocated, clashCount,
   *     capacity, usableCapacity, utilisation, score, clean, departments,
   *     halls: [HallAllocation], unallocatedStudents: [...] }
   *
   * A 409 here is usually a *legitimate* strict-capacity rejection ("Need N
   * seats but only M are available"), so the message is surfaced verbatim
   * rather than being flattened into a generic failure.
   */
  const runGeneration = async () => {
    setFailure(null);
    setPhase('allocating');
    setProgress(4);
    setResult(null);

    // The bar is honest-but-approximate: axios gives us no server-side progress,
    // so it eases towards 93% while the real allocation runs and snaps to 100%
    // when the response lands.
    const ticker = setInterval(() => {
      setProgress((p) => Math.min(p + 6 + Math.random() * 5, 93));
    }, 200);

    try {
      const response = await seatingService.generate(examId, hallIds, rules, { departments });
      applyGeneration(response);

      clearInterval(ticker);
      setProgress(100);
      setResult(response);
      // Let the seat-fill animation breathe before revealing the summary.
      setTimeout(() => setPhase('done'), 620);
      toast.success(
        `${response.totalSeated} students seated across ${response.halls.length} hall${
          response.halls.length === 1 ? '' : 's'
        } for ${response.examCode}.`
      );
    } catch (error) {
      clearInterval(ticker);
      setProgress(0);
      setFailure(error?.message ?? 'The allocation engine could not finish.');
      setPhase('done');
      toast.error(error?.message ?? 'Seating generation failed.');
    }
  };

  /**
   * Publishes every hall from the run.
   *
   * `HallAllocation` carries no plan id, but the backend's plan id is exactly
   * `{examId}-{hallId}` (see `SeatingController` — it resolves the id against
   * the DB, which is why the hyphenated form is safe here), and the store was
   * just refreshed by `applyGeneration`.
   */
  const publishAll = async () => {
    const ids = existingPlans.map((p) => p.id);
    if (!ids.length) {
      toast.warning('There is nothing to publish yet.');
      return;
    }
    setPublishing(true);
    try {
      // Sequential keeps the audit trail ordered.
      // eslint-disable-next-line no-await-in-loop
      for (const id of ids) {
        await publishPlan(id);
      }
      toast.success(`${ids.length} hall plan(s) published to faculty.`);
    } catch (error) {
      toast.error(error?.message ?? 'Could not publish every plan.');
    } finally {
      setPublishing(false);
    }
  };

  /* ------------------------------ render ------------------------------ */
  if (!exams.length || !halls.length) {
    return (
      <DashboardLayout title="Generate Seating" subtitle="Examination Cell · Allocation">
        <PageHeader eyebrow="Allocation engine" icon={Sparkles} title="Generate seating" />
        <Card>
          <EmptyState
            icon={Sparkles}
            title="Nothing to allocate yet"
            description="Add at least one hall and one exam, then come back to run the allocation engine."
            action={
              <div className="flex gap-2">
                <Button as={Link} to="/admin/halls" leftIcon={Building2}>
                  Add halls
                </Button>
                <Button as={Link} to="/admin/exams" leftIcon={CalendarDays}>
                  Schedule exam
                </Button>
              </div>
            }
          />
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Generate Seating" subtitle="Examination Cell · Allocation">
      <PageHeader
        eyebrow="Allocation engine"
        icon={Sparkles}
        title="Generate seating"
        subtitle="Pick an exam, choose the halls, set the anti-cheating rules and let the engine allocate every seat."
        actions={
          phase === 'done' ? (
            <Button variant="secondary" leftIcon={RotateCcw} onClick={resetWizard}>
              New run
            </Button>
          ) : (
            <Button as={Link} to="/admin/hall-plan" variant="secondary" leftIcon={Grid3x3}>
              Hall plan viewer
            </Button>
          )
        }
      />

      {/* ---------------- allocating overlay ---------------- */}
      {phase === 'allocating' ? (
        <Card className="relative overflow-hidden">
          <Confetti active={false} />
          <div className="flex min-h-[440px] flex-col items-center justify-center py-6">
            <SeatAllocationLoader progress={progress} status={stageLabel} />
          </div>
        </Card>
      ) : null}

      {/* ---------------- success screen ---------------- */}
      {phase === 'done' && result ? (
        <SuccessScreen
          result={result}
          exam={exam}
          rules={rules}
          onPublish={publishAll}
          publishing={publishing}
          onViewPlans={() => navigate('/admin/hall-plan')}
          onReset={resetWizard}
        />
      ) : null}

      {/* ---------------- failure screen ---------------- */}
      {phase === 'done' && failure && !result ? (
        <Card className="border-rose-200 dark:border-rose-500/30">
          <EmptyState
            icon={AlertTriangle}
            title="Allocation failed"
            description={failure}
            action={
              <div className="flex gap-2">
                <Button variant="secondary" leftIcon={RotateCcw} onClick={resetWizard}>
                  Start over
                </Button>
                <Button leftIcon={Sparkles} onClick={runGeneration}>
                  Try again
                </Button>
              </div>
            }
          />
        </Card>
      ) : null}

      {/* ---------------- wizard ---------------- */}
      {phase === 'form' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Stepper current={step} />

            <Card>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 1 ? (
                    <ExamStep
                      exams={exams}
                      examId={examId}
                      onChange={handleExamChange}
                      students={students}
                      plans={plans}
                    />
                  ) : null}

                  {step === 2 ? (
                    <HallsStep
                      halls={halls}
                      hallIds={hallIds}
                      onToggle={toggleHall}
                      onSelectAll={selectAllHalls}
                      onClear={clearHalls}
                      existingHallIds={existingPlans.map((p) => p.hallId)}
                    />
                  ) : null}

                  {step === 3 ? (
                    <RulesStep
                      rules={rules}
                      onToggle={toggleRule}
                      onPreset={(preset) => setRules({ ...preset.rules })}
                      hallCount={hallIds.length}
                    />
                  ) : null}

                  {step === 4 ? (
                    <ReviewStep
                      exam={exam}
                      departments={departments}
                      onDepartments={setDepartments}
                      halls={selectedHalls}
                      rules={rules}
                      eligibleCount={eligibleStudents.length}
                      usableSeats={usableSeats}
                    />
                  ) : null}
                </motion.div>
              </AnimatePresence>

              {/* wizard footer */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <Button
                  variant="secondary"
                  leftIcon={ChevronLeft}
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                >
                  Back
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  {!canContinue ? (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      {step === 2 ? 'Select at least one hall' : 'Select an exam to continue'}
                    </span>
                  ) : null}
                  {step < 4 ? (
                    <Button
                      rightIcon={ChevronRight}
                      disabled={!canContinue}
                      onClick={() => setStep((s) => Math.min(4, s + 1))}
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      leftIcon={Sparkles}
                      disabled={!canContinue || eligibleStudents.length === 0}
                      onClick={runGeneration}
                    >
                      Allocate {eligibleStudents.length} students
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* live summary rail */}
          <SummaryRail
            exam={exam}
            halls={selectedHalls}
            eligibleCount={eligibleStudents.length}
            usableSeats={usableSeats}
            activeRules={activeRules}
            overflowExpected={overflowExpected}
          />
        </div>
      ) : null}
    </DashboardLayout>
  );
}

/* ------------------------------------------------------------------ *
 * Stepper
 * ------------------------------------------------------------------ */
function Stepper({ current }) {
  return (
    <Card className="no-print">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          const isDone = item.id < current;
          const isCurrent = item.id === current;
          return (
            <li key={item.id} className="flex flex-1 items-center gap-2 sm:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold transition-all duration-300',
                    isCurrent
                      ? 'bg-primary-600 text-white shadow-glow'
                      : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block truncate text-[13px] font-bold',
                      isCurrent ? 'text-ink dark:text-white' : isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted'
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Step {item.id}
                  </span>
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <span className="hidden h-0.5 w-6 shrink-0 rounded-full bg-slate-200 sm:block dark:bg-slate-800">
                  <motion.span
                    className="block h-full rounded-full bg-primary-500"
                    initial={false}
                    animate={{ width: isDone ? '100%' : '0%' }}
                    transition={{ duration: 0.4 }}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Step 1 — exam
 * ------------------------------------------------------------------ */
function ExamStep({ exams, examId, onChange, students, plans }) {
  const selected = exams.find((e) => e.id === examId);

  return (
    <div className="space-y-5">
      <CardHeader>
        <CardTitle
          icon={CalendarDays}
          title="Which exam are we allocating?"
          subtitle="Only the selected exam's departments and years enter the queue."
        />
      </CardHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {exams.map((item) => {
          const planCount = plans.filter((p) => p.examId === item.id).length;
          const isSelected = item.id === examId;
          const eligible = students.filter(
            (s) => item.departments.includes(s.department) && Number(s.year) >= Number(item.minYear ?? 1)
          ).length;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200',
                isSelected
                  ? 'border-primary-500 bg-primary-50/70 shadow-glow dark:border-primary-400 dark:bg-primary-500/10'
                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-primary-500/40'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-bold text-ink dark:text-white">
                    {item.title}
                    {isSelected ? (
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary-600 text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={4} />
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
                    {item.code} · {item.course}
                  </p>
                </div>
                <StatusBadge status={item.status} size="sm" />
              </div>

              <p className="mt-3 text-[12px] font-medium text-slate-600 dark:text-slate-300">
                {formatDate(item.date, 'long')} · {formatTimeRange(item.startTime, item.endTime)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {item.departments.map((code) => (
                  <DeptBadge key={code} code={code} size="sm" />
                ))}
                {item.years?.map((year) => (
                  <Badge key={year} tone="slate" size="sm">
                    Year {year}
                  </Badge>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3 text-[11px] font-semibold text-muted dark:border-slate-800">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {eligible} eligible
                </span>
                <span className="flex items-center gap-1">
                  <Grid3x3 className="h-3 w-3" /> {planCount} plan{planCount === 1 ? '' : 's'}
                </span>
                {planCount ? (
                  <span className="ml-auto text-amber-600 dark:text-amber-400">will be replaced</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-primary-200 bg-primary-50/60 p-4 text-[13px] text-primary-800 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            Students below <strong>Year {selected.minYear}</strong> and any department outside{' '}
            <strong>{selected.departments.join(', ')}</strong> are automatically excluded from the allocation.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Step 2 — halls
 * ------------------------------------------------------------------ */
function HallsStep({ halls, hallIds, onToggle, onSelectAll, onClear, existingHallIds }) {
  const selectedCapacity = halls
    .filter((h) => hallIds.includes(h.id))
    .reduce((sum, h) => sum + Math.max(0, h.rows * h.cols - (h.blockedSeats?.length ?? 0)), 0);

  return (
    <div className="space-y-5">
      <CardHeader
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onSelectAll}>
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          </div>
        }
      >
        <CardTitle
          icon={Building2}
          title="Which halls should be used?"
          subtitle="Blocked seats are automatically removed from the usable grid."
        />
      </CardHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {halls.map((hall) => {
          const blocked = hall.blockedSeats?.length ?? 0;
          const usable = Math.max(0, hall.rows * hall.cols - blocked);
          const isSelected = hallIds.includes(hall.id);
          const hasPlan = existingHallIds.includes(hall.id);

          return (
            <button
              key={hall.id}
              type="button"
              onClick={() => onToggle(hall.id)}
              aria-pressed={isSelected}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200',
                isSelected
                  ? 'border-primary-500 bg-primary-50/70 shadow-glow dark:border-primary-400 dark:bg-primary-500/10'
                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-primary-500/40'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink dark:text-white">{hall.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
                    <MapPin className="h-3 w-3" /> {hall.block} · Floor {hall.floor}
                  </p>
                </div>
                <span
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition',
                    isSelected
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  )}
                >
                  {isSelected ? <Check className="h-3 w-3" strokeWidth={4} /> : null}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniCell label="Seats" value={usable} />
                <MiniCell label="Grid" value={`${hall.rows}×${hall.cols}`} />
                <MiniCell label="Blocked" value={blocked} tone={blocked ? 'warn' : 'muted'} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge tone={hall.type === 'AC' ? 'info' : 'slate'} size="sm">
                  {hall.type === 'AC' ? (
                    <>
                      <Snowflake className="h-3 w-3" /> AC
                    </>
                  ) : (
                    <>
                      <Wind className="h-3 w-3" /> Non-AC
                    </>
                  )}
                </Badge>
                {hasPlan ? (
                  <Badge tone="warning" size="sm">
                    Existing plan
                  </Badge>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
        <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
          {hallIds.length} of {halls.length} halls selected
        </p>
        <p className="text-[13px] font-bold text-ink dark:text-white">
          <span className="text-primary-600 dark:text-primary-300">{selectedCapacity}</span> usable seats
        </p>
      </div>
    </div>
  );
}

function MiniCell({ label, value, tone = 'default' }) {
  return (
    <div className="rounded-xl bg-white px-2 py-1.5 ring-1 ring-slate-100 dark:bg-slate-900/70 dark:ring-slate-800">
      <p
        className={cn(
          'text-[13px] font-extrabold leading-none',
          tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : tone === 'muted' ? 'text-muted' : 'text-ink dark:text-white'
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Step 3 — rules
 * ------------------------------------------------------------------ */
function RulesStep({ rules, onToggle, onPreset, hallCount }) {
  const activeCount = RULE_CATALOG.filter((r) => rules[r.key]).length;

  return (
    <div className="space-y-5">
      <CardHeader>
        <CardTitle
          icon={SlidersHorizontal}
          title="Anti-cheating rules"
          subtitle="Every rule is enforced seat-by-seat and re-verified after the grid is built."
        />
      </CardHeader>

      {/* presets */}
      <div className="grid gap-3 sm:grid-cols-3">
        {RULE_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const matches =
            RULE_CATALOG.every((rule) => Boolean(preset.rules[rule.key]) === Boolean(rules[rule.key]));
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPreset(preset)}
              className={cn(
                'rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5',
                matches
                  ? 'border-primary-500 bg-primary-50/70 shadow-glow dark:border-primary-400 dark:bg-primary-500/10'
                  : 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900/50'
              )}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white">
                <Icon className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                {preset.label}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">{preset.description}</span>
            </button>
          );
        })}
      </div>

      {/* individual switches */}
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 dark:divide-slate-800 dark:border-slate-700">
        {RULE_CATALOG.map((rule) => (
          <div key={rule.key} className="flex items-start justify-between gap-5 p-4">
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-ink dark:text-white">{rule.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{rule.description}</p>
            </div>
            <Switch
              label={rule.label}
              checked={Boolean(rules[rule.key])}
              onChange={(value) => onToggle(rule.key, value)}
              className="w-[190px] shrink-0"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-[13px] dark:bg-slate-800/50">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
        <span className="text-slate-600 dark:text-slate-300">
          <strong className="font-bold text-ink dark:text-white">{activeCount}</strong> of {RULE_CATALOG.length} rules active
          across {hallCount} hall{hallCount === 1 ? '' : 's'}.
        </span>
        {!rules.avoidSameDeptAdjacent ? (
          <Badge tone="warning" size="sm">
            <Ban className="h-3 w-3" /> adjacency not blocked
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Step 4 — review
 * ------------------------------------------------------------------ */
function ReviewStep({ exam, departments, onDepartments, halls, rules, eligibleCount, usableSeats }) {
  return (
    <div className="space-y-5">
      <CardHeader>
        <CardTitle
          icon={CheckCircle2}
          title="Review and generate"
          subtitle="Confirm the numbers below, then run the allocation engine."
        />
      </CardHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Students to seat" value={eligibleCount} icon={Users} tone="primary" />
        <SummaryTile label="Halls in use" value={halls.length} icon={Building2} tone="accent" />
        <SummaryTile
          label="Usable seats"
          value={usableSeats}
          icon={Armchair}
          tone={usableSeats >= eligibleCount ? 'emerald' : 'amber'}
        />
      </div>

      <div>
        <p className="mb-2 text-[13px] font-bold text-slate-700 dark:text-slate-200">
          Departments to include
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {(exam?.departments ?? []).map((code) => (
            <Checkbox
              key={code}
              label={code}
              description="Include every eligible student from this department"
              checked={departments.includes(code)}
              onChange={(event) =>
                onDepartments(
                  event.target.checked
                    ? [...departments, code]
                    : departments.filter((d) => d !== code)
                )
              }
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-700">
        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Active rules</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {RULE_CATALOG.map((rule) => (
            <Badge key={rule.key} tone={rules[rule.key] ? 'primary' : 'slate'} size="sm">
              {rules[rule.key] ? <Check className="h-3 w-3" strokeWidth={3} /> : <Ban className="h-3 w-3" />}
              {rule.label}
            </Badge>
          ))}
        </div>
      </div>

      {usableSeats < eligibleCount ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            You have <strong>{usableSeats}</strong> usable seats for <strong>{eligibleCount}</strong> eligible
            students. The remaining{' '}
            <strong>{eligibleCount - usableSeats}</strong> will be reported as <em>unallocated</em> — add another hall
            or relax the <em>keep last row clear</em> rule to fit everyone.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SummaryTile({ label, value, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
    accent: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl font-extrabold leading-none text-ink dark:text-white">{value}</p>
        <p className="mt-1 truncate text-[11px] font-semibold text-muted">{label}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Summary rail
 * ------------------------------------------------------------------ */
function SummaryRail({ exam, halls, eligibleCount, usableSeats, activeRules, overflowExpected }) {
  const fillRate = usableSeats ? Math.round((eligibleCount / usableSeats) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle icon={Sparkles} title="Run summary" subtitle="Live preview of the allocation" />

        <dl className="mt-4 space-y-3 text-[13px]">
          <Row label="Exam" value={exam ? `${exam.code} · ${exam.title}` : 'Not selected'} />
          <Row label="Date" value={exam ? formatDate(exam.date, 'long') : '—'} />
          <Row label="Halls" value={halls.length ? `${halls.length} selected` : 'None selected'} />
          <Row label="Students" value={String(eligibleCount)} />
          <Row label="Usable seats" value={String(usableSeats)} />
          <Row label="Rules active" value={`${activeRules} / ${RULE_CATALOG.length}`} />
        </dl>

        {halls.length ? (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Seat fill estimate</p>
            <ProgressBar
              value={Math.min(fillRate, 100)}
              tone={overflowExpected ? 'amber' : 'emerald'}
              size="lg"
              showLabel
              label={overflowExpected ? 'Will overflow' : 'Fits comfortably'}
            />
            {overflowExpected ? (
              <p className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {eligibleCount - usableSeats} student(s) may not get a seat.
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card>
        <CardTitle icon={Building2} title="Selected halls" subtitle={`${halls.length} in this run`} />
        {halls.length ? (
          <ul className="mt-4 space-y-2">
            {halls.map((hall) => {
              const usable = Math.max(0, hall.rows * hall.cols - (hall.blockedSeats?.length ?? 0));
              return (
                <li
                  key={hall.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-ink dark:text-white">{hall.name}</span>
                    <span className="block truncate text-[10px] font-medium text-muted">
                      {hall.rows}×{hall.cols} grid · {hall.type}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-extrabold text-primary-600 dark:text-primary-300">
                      {usable}
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">seats</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={Building2} title="No halls yet" description="Pick halls in step 2." compact />
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-bold text-ink dark:text-slate-100">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Success screen
 * ------------------------------------------------------------------ */
/**
 * Success screen.
 *
 * Renders the `GenerateSeatingResponse` verbatim:
 *   { totalSeated, unallocated, clashCount, capacity, usableCapacity,
 *     utilisation, score, clean, departments,
 *     halls: [{ hallId, hallCode, hallName, rows, cols, grid, capacity, blocked,
 *               usable, allocated, utilisation, departments, verification }],
 *     unallocatedStudents: [{ studentId, rollNo, name, department, year, reason }] }
 *
 * Note `halls` contains an entry for *every* requested hall, including ones
 * that ended up empty — so the card count is "halls you picked", not "halls
 * with students". `verification.score` is the engine's own 0–100 quality score.
 */
function SuccessScreen({ result, exam, rules, onPublish, publishing, onViewPlans, onReset }) {
  const halls = result?.halls ?? [];
  const unallocatedStudents = result?.unallocatedStudents ?? [];

  // Prefer the server's aggregate; fall back to summing the per-hall numbers so
  // the screen still renders if a future response trims a field.
  const allocated = result?.totalSeated ?? halls.reduce((s, h) => s + h.allocated, 0);
  const capacity = result?.usableCapacity ?? halls.reduce((s, h) => s + h.usable, 0);
  const utilisation = result?.utilisation ?? (capacity ? Math.round((allocated / capacity) * 100) : 0);
  const clashes = result?.clashCount ?? halls.reduce((s, h) => s + (h.verification?.clashes ?? 0), 0);
  const adjacency =
    halls.reduce((s, h) => s + (h.verification?.adjacentSameDept ?? 0), 0);
  const score = result?.score ?? halls[0]?.verification?.score ?? 0;
  const clean = result?.clean ?? clashes === 0;
  const filledHalls = halls.filter((h) => h.allocated > 0).length;

  // The publish endpoint is plan-scoped and ids are derived from the response.
  const allPublished = halls.length > 0 && halls.every((h) => h.status === 'PUBLISHED');

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden">
        <Confetti active={clean} />
        <div className="relative flex flex-col items-center py-6 text-center">
          <SuccessCheck />
          <h2 className="mt-4 font-display text-2xl font-extrabold text-ink dark:text-white">
            Seating allocated successfully
          </h2>
          <p className="mt-1.5 max-w-lg text-sm text-muted">
            <strong className="font-semibold text-ink dark:text-slate-200">
              {filledHalls} of {halls.length} hall{halls.length === 1 ? '' : 's'} filled
            </strong>{' '}
            for {exam?.code} · {exam?.title}.{' '}
            {clashes === 0
              ? 'Verification found zero duplicate students.'
              : `Verification found ${clashes} duplicate student reference(s) — review the plans.`}
          </p>

          <div className="mt-6 grid w-full max-w-3xl gap-3 sm:grid-cols-4">
            <SummaryTile label="Seats filled" value={allocated} icon={Armchair} tone="primary" />
            <SummaryTile label="Utilisation" value={`${utilisation}%`} icon={Zap} tone="accent" />
            <SummaryTile
              label="Clashes"
              value={clashes}
              icon={ShieldCheck}
              tone={clashes === 0 ? 'emerald' : 'amber'}
            />
            <SummaryTile
              label="Unallocated"
              value={unallocatedStudents.length || result?.unallocated || 0}
              icon={Users}
              tone={unallocatedStudents.length ? 'amber' : 'emerald'}
            />
          </div>

          {/* engine quality score */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Badge tone={score >= 85 ? 'success' : score >= 60 ? 'warning' : 'danger'} dot>
              Engine score {score}/100
            </Badge>
            <Badge tone="slate">{adjacency} adjacency violation(s)</Badge>
            {Object.entries(result?.departments ?? {}).map(([code, count]) => (
              <Badge key={code} tone="slate">
                {code} · {count}
              </Badge>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={onViewPlans} leftIcon={Grid3x3}>
              Open hall plan
            </Button>
            <Button
              variant="secondary"
              leftIcon={CheckCircle2}
              loading={publishing}
              disabled={allPublished || !filledHalls}
              onClick={onPublish}
            >
              {allPublished ? 'All published' : 'Publish all to faculty'}
            </Button>
            <Button variant="ghost" leftIcon={RotateCcw} onClick={onReset}>
              Generate another
            </Button>
          </div>
        </div>
      </Card>

      {/* students who could not be seated, with the backend's stated reason */}
      {unallocatedStudents.length ? (
        <Card>
          <CardHeader>
            <CardTitle
              icon={AlertTriangle}
              title={`${unallocatedStudents.length} student(s) could not be seated`}
              subtitle="Turn off strict capacity, or add another hall, and run again."
            />
          </CardHeader>
          <div className="mt-4 max-h-56 overflow-y-auto scrollbar-thin">
            <table className="min-w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2 font-bold">Roll No</th>
                  <th className="px-3 py-2 font-bold">Name</th>
                  <th className="px-3 py-2 font-bold">Department</th>
                  <th className="px-3 py-2 font-bold">Year</th>
                  <th className="px-3 py-2 font-bold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {unallocatedStudents.map((s) => (
                  <tr key={s.studentId} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono font-bold text-ink dark:text-slate-100">
                      {s.rollNo}
                    </td>
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{s.name}</td>
                    <td className="px-3 py-1.5">
                      <DeptBadge code={s.department} size="sm" />
                    </td>
                    <td className="px-3 py-1.5 text-slate-500">{s.year}</td>
                    <td className="px-3 py-1.5 text-amber-700 dark:text-amber-300">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* per-hall breakdown with animated seat fill */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {halls.map((hall, index) => (
          <motion.div
            key={hall.hallId}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.4 }}
          >
            <Card hover className="h-full">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink dark:text-white">
                    {hall.hallName}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted">{hall.hallCode}</p>
                </div>
                <StatusBadge
                  status={hall.allocated > 0 ? 'ALLOCATED' : 'SCHEDULED'}
                  size="sm"
                />
              </div>

              {/* mini seat grid fills in sequentially */}
              <div className="mt-4 flex flex-wrap gap-[3px]">
                {(hall.grid ?? []).flat().map((seat, seatIndex) => {
                  const filled = Boolean(seat.studentId);
                  return (
                    <motion.span
                      key={`${seat.row}-${seat.col}`}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.05 + Math.min(seatIndex * 0.004, 1.1), duration: 0.25 }}
                      className={cn(
                        'h-3 w-3 rounded-[3px]',
                        seat.blocked
                          ? 'bg-slate-200 dark:bg-slate-700'
                          : filled
                            ? 'bg-primary-500'
                            : 'bg-slate-100 dark:bg-slate-800'
                      )}
                      title={
                        filled
                          ? `${seat.rollNo} · ${seat.name}`
                          : seat.blocked
                            ? 'Blocked seat'
                            : 'Vacant'
                      }
                    />
                  );
                })}
              </div>

              <div className="mt-4 space-y-2">
                <ProgressBar
                  value={hall.utilisation}
                  tone={hall.utilisation > 85 ? 'emerald' : 'primary'}
                  showLabel
                  label={`${hall.allocated} / ${hall.usable} usable seats`}
                />
                <div className="flex flex-wrap gap-1">
                  {Object.entries(plan.stats.departments).map(([code, count]) => (
                    <DeptBadge key={code} code={code} size="sm" />
                  ))}
                </div>
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                {plan.verification.isClean ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified clean · score{' '}
                    {plan.verification.score}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />{' '}
                    {hall.verification?.adjacentSameDept ?? 0} adjacency pair(s) · score{' '}
                    {hall.verification?.score ?? 0}
                  </>
                )}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle
            icon={SlidersHorizontal}
            title="Rules used for this run"
            subtitle="Reproduce it any time with the same exam, halls and rules."
          />
        </CardHeader>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {RULE_CATALOG.map((rule) => (
            <Badge key={rule.key} tone={rules[rule.key] ? 'primary' : 'slate'} size="sm">
              {rules[rule.key] ? <Check className="h-3 w-3" strokeWidth={3} /> : <Ban className="h-3 w-3" />}
              {rule.label}
            </Badge>
          ))}
        </div>
        {adjacency > 0 ? (
          <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
            {adjacency} same-department adjacency pair(s) remain. Turn on stricter rules and re-run, or swap the
            seats manually in the hall plan viewer.
          </p>
        ) : null}
      </Card>
    </div>
  );
}

export { GenerateSeating };
