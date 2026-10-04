import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, Legend,
} from 'recharts';
import { DEPARTMENTS } from '../../data/departments';

const AXIS = {
  stroke: '#94a3b8',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

function CustomTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-soft-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      {label ? <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p> : null}
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.dataKey} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color ?? entry.fill }} />
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : entry.value}
            {suffix}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Seats allocated over time — area chart used on the admin dashboard. */
export function AllocationTrendChart({ data = [], height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gradSeats" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradStudents" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
        <XAxis dataKey="month" {...AXIS} />
        <YAxis {...AXIS} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4F46E5', strokeDasharray: '4 4' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area
          type="monotone"
          dataKey="seats"
          name="Seats allocated"
          stroke="#4F46E5"
          strokeWidth={2.5}
          fill="url(#gradSeats)"
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
        />
        <Area
          type="monotone"
          dataKey="students"
          name="Students"
          stroke="#14B8A6"
          strokeWidth={2.5}
          fill="url(#gradStudents)"
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Department distribution donut. */
export function DepartmentPieChart({ data = [], height = 260 }) {
  const fallback = DEPARTMENTS.map((dept, index) => ({
    name: dept.short,
    value: 0,
    color: dept.color,
    id: dept.code ?? index,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data?.length ? data : fallback}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="88%"
          paddingAngle={3}
          stroke="none"
        >
          {(data?.length ? data : fallback).map((entry, index) => (
            <Cell key={entry.id ?? entry.name ?? index} fill={entry.color ?? '#94A3B8'} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={28}
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 12, fontWeight: 600 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Hall utilisation bars. */
export function HallUtilisationChart({ data = [], height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="gradBars" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
        <XAxis dataKey="hall" {...AXIS} />
        <YAxis {...AXIS} domain={[0, 100]} unit="%" />
        <Tooltip content={<CustomTooltip suffix="%" />} cursor={{ fill: 'rgba(79,70,229,0.06)' }} />
        <Bar dataKey="utilisation" name="Utilisation" fill="url(#gradBars)" radius={[8, 8, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Duty count trend (faculty dashboard). */
export function DutyTrendChart({ data = [], height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
        <XAxis dataKey="month" {...AXIS} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="duties"
          name="Duties"
          stroke="#4F46E5"
          strokeWidth={3}
          dot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#4F46E5' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Compact donut used on the faculty workload card. */
export function WorkloadDonut({ data = [], height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="84%" paddingAngle={3} stroke="none">
          {data.map((entry, index) => (
            <Cell key={entry.name ?? index} fill={entry.color ?? '#94A3B8'} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bar chart for department-wise reports. */
export function DepartmentBarChart({ data = [], height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 18, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" horizontal={false} />
        <XAxis type="number" {...AXIS} />
        <YAxis type="category" dataKey="department" {...AXIS} width={62} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,70,229,0.06)' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
        <Bar dataKey="eligible" name="Eligible" fill="#4F46E5" radius={[0, 6, 6, 0]} maxBarSize={18} />
        <Bar dataKey="allocated" name="Allocated" fill="#14B8A6" radius={[0, 6, 6, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { CustomTooltip };