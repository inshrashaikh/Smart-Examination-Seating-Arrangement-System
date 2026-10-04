import { Link } from 'react-router-dom';
import { Grid3x3, Lock, CalendarClock, ArrowRight, Info } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import HallPlanViewer from '../../components/seating/HallPlanViewer';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatDate, relativeTime } from '../../utils/format';

/**
 * Faculty hall plan — read-only. Faculty only see plans for the halls they
 * are duty-assigned to, which is what the real API would scope too.
 */
export default function FacultyHallPlan() {
  const { user } = useAuth();
  const { plans, exams, halls, duties } = useData();

  // Scope to the halls this person actually invigilates.
  const myHallIds = duties
    .filter((d) => d.facultyEmail === user?.email || d.facultyId === user?.id)
    .map((d) => d.hallId);

  const scoped = plans.filter((p) => myHallIds.includes(p.hallId));

  // A member of staff may not have duties loaded yet — fall back to every hall.
  const visible = scoped.length ? scoped : plans;

  const allocated = visible.reduce((sum, p) => sum + p.stats.allocated, 0);
  const clashes = visible.reduce((sum, p) => sum + p.verification.clashes, 0);

  return (
    <DashboardLayout title="Hall Plan" subtitle="Invigilator Portal">
      <PageHeader
        eyebrow="Seating reference"
        icon={Grid3x3}
        title="Hall plan"
        subtitle="Locate your candidates, verify their seat and keep a copy for the invigilation file."
        breadcrumb={[{ label: 'Invigilator Portal', to: '/faculty' }, { label: 'Hall Plan' }]}
        actions={
          <Button as={Link} to="/faculty/attendance" variant="secondary" leftIcon={CalendarClock}>
            Attendance sheet
          </Button>
        }
      />

      {visible.length ? (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard
            index={0}
            label="Plans visible to you"
            value={visible.length}
            icon={Grid3x3}
            tone="primary"
            hint={scoped.length ? 'Scoped to your duty halls' : 'All published plans'}
          />
          <StatCard
            index={1}
            label="Candidates mapped"
            value={allocated}
            icon={CalendarClock}
            tone="accent"
            hint="Across visible plans"
          />
          <StatCard
            index={2}
            label="Verified clashes"
            value={clashes}
            icon={Lock}
            tone={clashes === 0 ? 'emerald' : 'rose'}
            trendLabel={clashes === 0 ? 'All plans verified clean' : 'Contact the examination cell'}
          />
        </div>
      ) : null}

      {!myHallIds.length ? (
        <Card className="mb-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                <Info className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink dark:text-white">No duty halls assigned yet</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  Hall plans are normally scoped to the halls you invigilate. Since you have no duty on the roster,
                  every published plan is shown instead.
                </p>
              </div>
            </div>
            <Button as={Link} to="/faculty/duties" variant="secondary" rightIcon={ArrowRight} className="shrink-0">
              View my duties
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] font-semibold text-muted">
          Last updated{' '}
          {visible.length ? relativeTime(visible.map((p) => p.createdAt).sort().at(-1)) : '—'}
        </p>
        <Badge tone="info" dot>
          <Lock className="h-3 w-3" /> Read-only — swaps need the examination cell
        </Badge>
      </div>

      <HallPlanViewer mode="faculty" plans={visible} exams={exams} halls={halls} />

      {visible.length ? (
        <p className="mt-4 text-[11px] text-muted">
          Showing {visible.length} of {plans.length} plans ·{' '}
          {Array.from(new Set(visible.map((p) => p.examCode))).join(', ')} ·{' '}
          {formatDate(visible[0].date)}
        </p>
      ) : null}
    </DashboardLayout>
  );
}

export { FacultyHallPlan };
