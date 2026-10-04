/** Marketing + help content for the landing page and FAQ. */
import {
  Armchair, LayoutGrid, Shuffle, FileBarChart, ClipboardCheck, SlidersHorizontal,
  UploadCloud, Settings2, Sparkles, Send, ShieldCheck,
} from 'lucide-react';

export const FEATURES = [
  {
    id: 'auto-seat-allocation',
    icon: Armchair,
    title: 'Auto Seat Allocation',
    description:
      'Constraint-based engine places every student in milliseconds, balancing departments, years and halls without a single manual drag.',
    accent: 'primary',
    bullets: ['Deterministic & reproducible', 'Sub-second for 10,000+ students'],
  },
  {
    id: 'hall-plan-generation',
    icon: LayoutGrid,
    title: 'Hall Plan Generation',
    description:
      'Render a printable hall plan for any room: colour-coded seats, aisle logic, blocked-seat handling and one-click export.',
    accent: 'accent',
    bullets: ['Colour-coded by department', 'Print & PDF ready'],
  },
  {
    id: 'department-mixing',
    icon: Shuffle,
    title: 'Department Mixing',
    description:
      'Keep adjacent, diagonal and same-year students apart automatically so copied answers become practically impossible.',
    accent: 'amber',
    bullets: ['4 configurable rules', 'Live violation counter'],
  },
  {
    id: 'instant-reports',
    icon: FileBarChart,
    title: 'Instant Reports',
    description:
      'Hall-wise, department-wise, student-wise and attendance reports generated on demand and exported to PDF or Excel.',
    accent: 'sky',
    bullets: ['4 report types', 'CSV / Excel / PDF export'],
  },
  {
    id: 'faculty-duty-view',
    icon: ClipboardCheck,
    title: 'Faculty Duty View',
    description:
      'Invite faculty to a read-only portal showing duties, hall plans and attendance sheets for their assigned halls only.',
    accent: 'violet',
    bullets: ['Auto duty reminders', 'Role-scoped access'],
  },
  {
    id: 'manual-override',
    icon: SlidersHorizontal,
    title: 'Manual Override',
    description:
      'Swap any two seats, block a desk, or move a student — every change is logged with a timestamped audit trail.',
    accent: 'rose',
    bullets: ['Click-to-swap', 'Full audit history'],
  },
];

export const HOW_IT_WORKS = [
  {
    id: 1,
    icon: UploadCloud,
    title: 'Upload Data',
    description:
      'Drag in the student register as CSV or Excel. We auto-detect columns, validate roll numbers and flag duplicates.',
    detail: 'CSV · XLSX · 10,000 rows',
  },
  {
    id: 2,
    icon: Settings2,
    title: 'Configure Halls',
    description:
      'Pick the halls for this exam, confirm rows × columns, block unusable desks and choose the mixing rules you need.',
    detail: 'Capacity & rules',
  },
  {
    id: 3,
    icon: Sparkles,
    title: 'Generate',
    description:
      'The engine allocates seats hall by hall and verifies every adjacency constraint before handing you the plan.',
    detail: 'Clash-free guarantee',
  },
  {
    id: 4,
    icon: Send,
    title: 'Publish & Export',
    description:
      'Publish to faculty in one click, then export hall plans, attendance sheets and reports as PDF or Excel.',
    detail: 'PDF · Excel · Print',
  },
];

export const STATS = [
  { id: 'students', label: 'Students seated', value: 10000, suffix: '+', icon: Armchair },
  { id: 'halls', label: 'Halls mapped', value: 500, suffix: '+', icon: LayoutGrid },
  { id: 'clashes', label: 'Adjacency clashes', value: 0, suffix: '', icon: ShieldCheck },
  { id: 'time', label: 'Time saved', value: 99, suffix: '%', icon: FileBarChart },
];

export const TESTIMONIALS = [
  {
    id: 't1',
    name: 'Dr. Kavita Deshmukh',
    role: 'Controller of Examinations',
    institution: 'Prestige Institute of Technology',
    quote:
      'We used to spend three full days building hall plans for every exam. SeatPlan does it in under four minutes, and the clash report gave our dean instant confidence.',
    rating: 5,
    photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 't2',
    name: 'Dr. Sridhar Reddy',
    role: 'Professor & Head, Mechanical',
    institution: 'Prestige Institute of Technology',
    quote:
      'The department-mixing rule is the killer feature. Same-year students are now scattered across the hall, and copying has dropped almost to zero.',
    rating: 5,
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 't3',
    name: 'Prof. Neha Bhosale',
    role: 'Assistant Professor, CSE',
    institution: 'Prestige Institute of Technology',
    quote:
      'As an invigilator I love the hall plan view. I can search my roll number, see exactly where the student sits and download the attendance sheet on my phone.',
    rating: 5,
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 't4',
    name: 'Dr. Imran Shaikh',
    role: 'Associate Professor, CSE',
    institution: 'Prestige Institute of Technology',
    quote:
      'Duty allocation used to be a spreadsheet nightmare. Now the coordinator assigns duties and faculty get a reminder the evening before.',
    rating: 4,
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  },
];

export const FAQS = [
  {
    id: 'q1',
    question: 'How does the allocation engine avoid same-department adjacency?',
    answer:
      'Students are grouped into per-department queues. For every seat the engine inspects the already-placed neighbours (left, front, and optionally all four diagonals) and picks from the largest queue that does not violate the active rules. Because the choice is always "the biggest allowed queue", departments interleave naturally and hall utilisation stays even. A verification pass then re-scans the finished grid and reports every violation, so you always see the clash count before publishing.',
  },
  {
    id: 'q2',
    question: 'Can I change a seat after generating a plan?',
    answer:
      'Yes. Click any two seats in the Hall Plan viewer to swap the students, and every change is written to an audit trail with a timestamp. You can also block a desk (damaged furniture, projector cable) so the generator routes around it.',
  },
  {
    id: 'q3',
    question: 'How do faculty members get their hall plan?',
    answer:
      'Once you publish a plan, every faculty member assigned invigilation duty for that hall sees it in their dashboard. Their view is strictly read-only and limited to their own halls, including the printable seating chart and the attendance sheet.',
  },
  {
    id: 'q4',
    question: 'What file formats can I upload?',
    answer:
      'CSV and XLSX. The importer auto-detects columns such as roll number, name, department, year and section, validates each row and shows a preview with duplicate detection before anything is committed.',
  },
  {
    id: 'q5',
    question: 'Is the seating plan deterministic?',
    answer:
      'It is. The generator seeds its pseudo-random shuffle from the exam id, the hall selection and the chosen rules, so regenerating the same configuration always produces the exact same plan — handy when you need to explain a result to a department.',
  },
  {
    id: 'q6',
    question: 'How long does a full exam allocation take?',
    answer:
      'For the reference dataset of 10,000 students across 500 halls the allocation completes in well under two seconds in the browser. The API endpoint is stateless, so the same workload scales horizontally on the backend.',
  },
];

export const SCREENSHOTS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Live exam statistics, allocation trends and department mix at a glance.',
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'hall-plan',
    label: 'Hall Plan',
    description: 'Colour-coded seating chart with hover details and click-to-swap.',
    image:
      'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Hall-wise, department-wise and attendance exports in one click.',
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'faculty',
    label: 'Faculty View',
    description: 'A focused portal for invigilators: duties, plan and attendance.',
    image:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
  },
];

export const INTEGRATIONS = [
  'Spring Boot REST API',
  'MySQL / PostgreSQL',
  'CSV & Excel export',
  'SAML / LDAP ready',
  'Role-based access',
  'Audit logging',
];