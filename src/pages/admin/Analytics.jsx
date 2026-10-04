import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, ShieldCheck, ShieldAlert, Gauge, Cpu, CheckCircle2, XCircle,
  RefreshCw, Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { seatingService } from '../../services';
import useFetch from '../../hooks/useFetch';
import { formatDate } from '../../utils/format';
import cn from '../../utils/cn';

const AXIS = { stroke: '#94a3b8', fontSize: 11, tickLine: false, axisLine: false };

/**
 * Analytics — plan quality across every exam, and the engine comparison.
 *
 * The numbers come from `GET /api/seating/quality`, which aggregates the same
 * stored plan summaries the hall-plan viewer shows, so the page cannot
 * disagree with the grids. Both engines' plans are verified by the same
 * backend code, which is what makes the JAVA-vs-PYTHON comparison honest.
 */
export default function Analytics() {
  const { exams } = useData();
  const toast = useToast();

  const { data, loading, error, refetch } = useFetch(
    () => seatingService.quality(),
    [],
    { immediate: true }
  );

  const examById = useMemo(
    () => new Map(exams.map((e) => [e.id, e])),
    [exams]
  );

  const rows = data?.exams ?? [];
  const engines = data?.engines ?? [];

  const totals = useMemo(() => {
    const allocated = rows.reduce((s, r) => s + r.allocated, 0);
    const capacity = rows.reduce((s, r) => s + r.capacity, 0);
    return {
      exams: rows.length,
      plans: rows.reduce((s, r) => s + r.halls, 0),
      allocated,
      capacity,
      clashes: rows.reduce((s, r) => s + r.clashes, 0),
      adjacent: rows.reduce((s, r) => s + r.adjacentSameDept, 0),
      clean: rows.filter((r) => r.clean).length,
      avgScore: rows.length
        ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
        : 0,
    };
  }, [rows]);

  const scoreChart = useMemo(
    () =>
      rows.map((r) => ({
        name: r.examCode,
        score: r.score,
        engine: r.engine,
      })),
    [rows]
  );

  const utilisationChart = useMemo(
    () =>
      rows.map((r) => ({
        name: r.examCode,
        utilisation: r.utilisation,
        allocated: r.allocated,
      })),
    [rows]
  );

  const engineChart = useMemo(
    () =>
      engines.map((e) => ({
        name: e.engine,
        'Avg score': e.averageScore,
        'Clean plans': e.cleanPlans,
        'Adjacency issues': e.adjacentSameDept,
      })),
    [engines]
  );

  return (
    <DashboardLayout title="Analytics" subtitle="Examination Cell · Plan quality">
      <PageHeader
        eyebrow="Quality analytics"
        icon={BarChart3}
        title="Analytics"
        subtitle="Plan quality across every exam, and how the allocation engines compare."
        breadcrumb={[{ label: 'Examination Cell', to: '/admin' }, { label: 'Analytics' }]}
        actions={
          <Button variant="ghost" leftIcon={RefreshCw} onClick={refetch} loading={loading}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card className="border-rose-200 dark:border-rose-500/30">
          <EmptyState
            icon={ShieldAlert}
            title="Could not load the analytics"
            description={error.message}
            action={<Button variant="secondary" leftIcon={RefreshCw} onClick={refetch}>Retry</Button>}
          />
        </Card>
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px]" />
          ))}
        </div>
      ) : !rows.length ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No plans to analyse yet"
            description="Generate a seating plan first — quality metrics appear here once an exam has allocations."
          />
        </Card>
      ) : (
        <>
          {/* ---------------- KPI row ---------------- */}
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard index={0} label="Plans analysed" value={totals.plans} icon={BarChart3} tone="primary"
              hint={`across ${totals.exams} exam${totals.exams === 1 ? '' : 's'}`} />
            <StatCard index={1} label="Average score" value={`${totals.avgScore}/100`} icon={Gauge}
              tone={totals.avgScore >= 85 ? 'emerald' : totals.avgScore >= 60 ? 'amber' : 'rose'} />
            <StatCard index={2} label="Duplicate clashes" value={totals.clashes}
              icon={totals.clashes === 0 ? ShieldCheck : ShieldAlert}
              tone={totals.clashes === 0 ? 'emerald' : 'rose'} />
            <StatCard index={3} label="Clean plans" value={`${totals.clean}/${rows.length}`}
              icon={CheckCircle2} tone={totals.clean === rows.length ? 'emerald' : 'amber'}
              hint={`${totals.adjacent} adjacency issue${totals.adjacent === 1 ? '' : 's'}`} />
          </div>

          {/* ---------------- engine comparison ---------------- */}
          <Card className="mb-5">
            <CardHeader
              action={
                <Badge tone="info" dot>
                  <Cpu className="h-3 w-3" /> {engines.length} engine{engines.length === 1 ? '' : 's'} on record
                </Badge>
              }
            >
              <CardTitle
                icon={Cpu}
                title="Engine comparison"
                subtitle="Both engines' plans are verified by the same backend code, so their scores are directly comparable."
              />
            </CardHeader>

            {engines.length ? (
              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                {/* per-engine cards */}
                <div className="space-y-3">
                  {engines.map((engine) => (
                    <div
                      key={engine.engine}
                      className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 text-sm font-extrabold text-ink dark:text-white">
                          <Sparkles className="h-4 w-4 text-primary-500" />
                          {engine.engine === 'PYTHON' ? 'Python optimizer (OR-Tools CP-SAT)' : 'Java engine (built-in)'}
                        </p>
                        <StatusBadge status={engine.engine === 'PYTHON' ? 'ALLOCATED' : 'SCHEDULED'} size="sm" />
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        <EngineStat label="Exams" value={engine.exams} />
                        <EngineStat label="Avg score" value={engine.averageScore} />
                        <EngineStat label="Clean" value={`${engine.cleanPlans}/${engine.exams}`} />
                        <EngineStat label="Adjacency" value={engine.adjacentSameDept} tone={engine.adjacentSameDept ? 'warn' : 'ok'} />
                      </div>
                    </div>
                  ))}
                  {engines.length === 1 ? (
                    <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted dark:bg-slate-800/50">
                      Only the {engines[0].engine} engine has produced plans so far. Start the Python
                      optimizer and generate with <code className="rounded bg-slate-200 px-1 font-mono text-[11px] dark:bg-slate-700">engine: AUTO</code> or{' '}
                      <code className="rounded bg-slate-200 px-1 font-mono text-[11px] dark:bg-slate-700">PYTHON</code> to
                      see the two compared.
                    </p>
                  ) : null}
                </div>

                {/* chart */}
                <div className="min-h-[220px]">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={engineChart} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                      <XAxis dataKey="name" {...AXIS} />
                      <YAxis {...AXIS} />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-soft-lg dark:border-slate-700 dark:bg-slate-900/95">
                              <p className="font-bold text-ink dark:text-white">{label}</p>
                              {payload.map((p) => (
                                <p key={p.dataKey} className="font-semibold text-slate-600 dark:text-slate-300">
                                  {p.name}: {p.value}
                                </p>
                              ))}
                            </div>
                          ) : null
                        }
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Avg score" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="Clean plans" fill="#14B8A6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="Adjacency issues" fill="#F43F5E" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </Card>

          {/* ---------------- per-exam quality ---------------- */}
          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardTitle icon={Gauge} title="Quality score by exam" subtitle="Lowest per-hall verification score for each exam" />
              <div className="mt-4 min-h-[240px]">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={scoreChart} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                    <XAxis dataKey="name" {...AXIS} />
                    <YAxis {...AXIS} domain={[0, 100]} />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-soft-lg dark:border-slate-700 dark:bg-slate-900/95">
                            <p className="font-bold text-ink dark:text-white">{label}</p>
                            <p className="font-semibold text-slate-600 dark:text-slate-300">
                              Score: {payload[0].value}/100
                            </p>
                          </div>
                        ) : null
                      }
                      cursor={{ fill: 'rgba(79,70,229,0.06)' }}
                    />
                    <Bar dataKey="score" name="Score" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {scoreChart.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.score >= 85 ? '#14B8A6' : entry.score >= 60 ? '#F59E0B' : '#F43F5E'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardTitle icon={BarChart3} title="Utilisation by exam" subtitle="Seats filled against planned capacity" />
              <div className="mt-4 min-h-[240px]">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={utilisationChart} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
                    <XAxis dataKey="name" {...AXIS} />
                    <YAxis {...AXIS} domain={[0, 100]} unit="%" />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-soft-lg dark:border-slate-700 dark:bg-slate-900/95">
                            <p className="font-bold text-ink dark:text-white">{label}</p>
                            {payload.map((p) => (
                              <p key={p.dataKey} className="font-semibold text-slate-600 dark:text-slate-300">
                                {p.name}: {p.value}
                              </p>
                            ))}
                          </div>
                        ) : null
                      }
                      cursor={{ fill: 'rgba(20,184,166,0.06)' }}
                    />
                    <Bar dataKey="utilisation" name="Utilisation" fill="#14B8A6" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* ---------------- per-exam table ---------------- */}
          <Card padded={false} className="overflow-hidden">
            <div className="px-5 pt-5">
              <CardTitle icon={BarChart3} title="Per-exam quality" subtitle="Every exam with a plan, worst-case score" />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/50">
                    <th className="px-5 py-2.5 font-bold">Exam</th>
                    <th className="px-3 py-2.5 font-bold">Engine</th>
                    <th className="px-3 py-2.5 font-bold text-right">Halls</th>
                    <th className="px-3 py-2.5 font-bold text-right">Allocated</th>
                    <th className="px-3 py-2.5 font-bold text-right">Utilisation</th>
                    <th className="px-3 py-2.5 font-bold text-right">Clashes</th>
                    <th className="px-3 py-2.5 font-bold text-right">Adjacency</th>
                    <th className="px-3 py-2.5 font-bold text-right">Score</th>
                    <th className="px-5 py-2.5 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const exam = examById.get(row.examId);
                    return (
                      <tr key={row.examId} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/30">
                        <td className="px-5 py-3">
                          <p className="font-bold text-ink dark:text-white">{row.examCode}</p>
                          <p className="max-w-[220px] truncate text-[11px] text-muted">
                            {row.examTitle}
                            {exam ? ` · ${formatDate(exam.date)}` : ''}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={row.engine === 'PYTHON' ? 'info' : 'slate'} size="sm">
                            {row.engine}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-ink dark:text-white">{row.halls}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-ink dark:text-white">
                          {row.allocated}/{row.capacity}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-ink dark:text-white">{row.utilisation}%</td>
                        <td className={cn('px-3 py-3 text-right font-mono font-bold', row.clashes ? 'text-rose-600 dark:text-rose-400' : 'text-ink dark:text-white')}>
                          {row.clashes}
                        </td>
                        <td className={cn('px-3 py-3 text-right font-mono font-bold', row.adjacentSameDept ? 'text-amber-600 dark:text-amber-400' : 'text-ink dark:text-white')}>
                          {row.adjacentSameDept}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span
                            className={cn(
                              'inline-block rounded-lg px-2 py-0.5 font-mono text-[11px] font-extrabold',
                              row.score >= 85
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                : row.score >= 60
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                            )}
                          >
                            {row.score}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {row.clean ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Clean
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              <XCircle className="h-3.5 w-3.5" /> Flagged
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}

function EngineStat({ label, value, tone = 'default' }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-800/50">
      <p
        className={cn(
          'font-display text-base font-extrabold leading-none',
          tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink dark:text-white'
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

export { Analytics };
