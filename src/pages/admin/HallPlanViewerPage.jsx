import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Grid3x3, Sparkles, FileBarChart, ShieldCheck, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import HallPlanViewer from '../../components/seating/HallPlanViewer';
import { useData } from '../../context/DataContext';

/**
 * Admin hall-plan workspace.
 *
 * The KPI rail above the grid is computed from the plan summaries the store
 * holds (`GET /api/seating/plans`); the grid itself is fetched per selection
 * inside `HallPlanViewer`, because the list endpoint does not carry the
 * `seats[][]` matrix.
 *
 * `swapSeats` is not optimistic: the backend re-validates adjacency and answers
 * 409 for an illegal swap, so the viewer must only move once the server has
 * confirmed. Errors bubble up and the viewer toasts the backend's own wording.
 */
export default function HallPlanViewerPage() {
  const { plans, exams, halls, swapSeats, publishPlan, loading } = useData();
  const [busy, setBusy] = useState(false);
  // A scanned seat QR code deep-links to ?seat=A3&exam=…&hall=… — the viewer
  // pre-fills its search so the named seat is highlighted on arrival.
  const [searchParams] = useSearchParams();
  const initialSeat = searchParams.get('seat');

  const stats = useMemo(() => {
    const allocated = plans.reduce((sum, p) => sum + (p.stats?.allocated ?? 0), 0);
    const capacity = plans.reduce((sum, p) => sum + (p.stats?.capacity ?? 0), 0);
    return {
      plans: plans.length,
      allocated,
      capacity,
      clashes: plans.reduce((sum, p) => sum + (p.verification?.clashes ?? 0), 0),
      // The backend field is `isClean` (verified against /v3/api-docs).
      clean: plans.filter((p) => p.verification?.isClean).length,
      halls: new Set(plans.map((p) => p.hallId)).size,
      published: plans.filter((p) => p.status === 'PUBLISHED').length,
    };
  }, [plans]);

  const handlePublish = async (planId) => {
    setBusy(true);
    try {
      await publishPlan(planId);
    } finally {
      setBusy(false);
    }
  };

  /** Forwards the viewer's four-argument call straight through to the store. */
  const handleSwap = (planId, seatA, seatB, options) => swapSeats(planId, seatA, seatB, options);

  const viewer = (
    <HallPlanViewer
      mode="admin"
      plans={plans}
      exams={exams}
      halls={halls}
      initialSeat={initialSeat}
      onSwap={handleSwap}
      onPublish={handlePublish}
      busy={busy}
    />
  );

  return (
    <DashboardLayout title="Hall Plan Viewer" subtitle="Examination Cell · Visualise & edit">
      <PageHeader
        eyebrow="Seating plans"
        icon={Grid3x3}
        title="Hall plan viewer"
        subtitle="Inspect every allocated grid, search a student to find their seat, and swap or publish in place."
        breadcrumb={[
          { label: 'Examination Cell', to: '/admin' },
          { label: 'Hall Plan Viewer' },
        ]}
        actions={
          <>
            <Button as={Link} to="/admin/reports" variant="secondary" leftIcon={FileBarChart}>
              Reports
            </Button>
            <Button as={Link} to="/admin/generate" leftIcon={Sparkles}>
              Generate seating
            </Button>
          </>
        }
      />

      {/* Nothing allocated yet — the viewer's own EmptyState carries the CTA. */}
      {!loading && !plans.length ? (
        <Card>{viewer}</Card>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              index={0}
              label="Seating plans"
              value={stats.plans}
              icon={Grid3x3}
              tone="primary"
              hint={`${stats.halls} distinct hall${stats.halls === 1 ? '' : 's'}`}
            />
            <StatCard
              index={1}
              label="Seats allocated"
              value={stats.allocated}
              icon={Sparkles}
              tone="accent"
              hint={`of ${stats.capacity} planned seats`}
            />
            <StatCard
              index={2}
              label="Duplicate clashes"
              value={stats.clashes}
              icon={stats.clashes === 0 ? ShieldCheck : AlertTriangle}
              tone={stats.clashes === 0 ? 'emerald' : 'rose'}
              trendLabel={stats.clashes === 0 ? 'All plans verified clean' : 'Review flagged plans'}
            />
            <StatCard
              index={3}
              label="Published to faculty"
              value={stats.published}
              icon={FileBarChart}
              tone="violet"
              hint={`${stats.clean} clean plan${stats.clean === 1 ? '' : 's'}`}
            />
          </div>

          {viewer}
        </>
      )}
    </DashboardLayout>
  );
}

export { HallPlanViewerPage };