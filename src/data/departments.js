/** Canonical department registry — colours are shared by plans, charts and badges. */
export const DEPARTMENTS = [
  {
    code: 'CSE',
    name: 'Computer Science & Engineering',
    short: 'CSE',
    color: '#4F46E5',
    soft: '#EEF2FF',
    text: '#3730A3',
  },
  {
    code: 'IT',
    name: 'Information Technology',
    short: 'IT',
    color: '#14B8A6',
    soft: '#F0FDFA',
    text: '#0F766E',
  },
  {
    code: 'ECE',
    name: 'Electronics & Communication',
    short: 'ECE',
    color: '#F59E0B',
    soft: '#FFFBEB',
    text: '#B45309',
  },
  {
    code: 'MECH',
    name: 'Mechanical Engineering',
    short: 'MECH',
    color: '#EC4899',
    soft: '#FDF2F8',
    text: '#BE185D',
  },
  {
    code: 'CIVIL',
    name: 'Civil Engineering',
    short: 'CIVIL',
    color: '#3B82F6',
    soft: '#EFF6FF',
    text: '#1D4ED8',
  },
];

export const DEPARTMENT_CODES = DEPARTMENTS.map((d) => d.code);

export const getDepartment = (code) =>
  DEPARTMENTS.find((d) => d.code === String(code ?? '').toUpperCase()) ?? {
    code: String(code ?? 'NA').toUpperCase(),
    name: String(code ?? 'Unassigned'),
    short: String(code ?? 'NA').toUpperCase(),
    color: '#64748B',
    soft: '#F1F5F9',
    text: '#334155',
  };

/** Years currently enrolled in the mock cohort. */
export const YEARS = [
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
];

export const ACADEMIC_YEAR = '2026–27';