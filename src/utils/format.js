/** Formatting helpers shared by tables, reports and cards. */

const dtf = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dtfLong = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const dtfShort = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });

export const formatDate = (value, style = 'short') => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  if (style === 'long') return dtfLong.format(date);
  if (style === 'day') return dtfShort.format(date);
  return dtf.format(date);
};

export const formatTime = (value) => {
  if (!value) return '—';
  const [h, m] = String(value).split(':');
  const hour = Number(h);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m ?? '00'} ${suffix}`;
};

export const formatTimeRange = (start, end) => `${formatTime(start)} – ${formatTime(end)}`;

export const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value ?? 0);

export const formatCompact = (value) => {
  const n = Number(value) || 0;
  if (n >= 10000000) return `${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return String(n);
};

export const formatPercent = (value, digits = 0) => `${Number(value ?? 0).toFixed(digits)}%`;

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

export const titleCase = (value = '') =>
  String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const truncate = (value = '', length = 40) =>
  String(value).length > length ? `${String(value).slice(0, length - 1)}…` : String(value);

/** "in 3 days" / "2 hours ago" style relative labels. */
export const relativeTime = (value) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!date || Number.isNaN(date.getTime())) return '—';
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const units = [
    [mins, 'minute'],
    [hours, 'hour'],
    [days, 'day'],
  ];
  const [value2, unit] = units.find(([v]) => v >= 1) || [mins, 'minute'];
  const label = `${Math.max(value2, 1)} ${unit}${Math.max(value2, 1) > 1 ? 's' : ''}`;
  return diff >= 0 ? `in ${label}` : `${label} ago`;
};

export const isToday = (value) => {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (!d || Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.toDateString() === now.toDateString();
};