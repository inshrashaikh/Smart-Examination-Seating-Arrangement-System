/**
 * Deterministic mock database. `seedDatabase()` is called once by the mock API
 * layer and returns a mutable in-memory store that behaves like the Spring Boot
 * backend (pagination, filters, sorting, reports, seating plans).
 *
 * Contents: 200 students · 8 halls · 5 exams · 14 faculty · duties · plans · reports.
 */
import { DEPARTMENTS } from './departments';
import { generateSeatingPlan, hashSeed, mulberry32 } from '../utils/seating';

/* ------------------------------------------------------------------ *
 * Name pools (kept plain so the dataset is deterministic)
 * ------------------------------------------------------------------ */
const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Ahmed', 'Ananya', 'Arjun', 'Bhavya', 'Chaitanya', 'Divya',
  'Farhan', 'Fatima', 'Gaurav', 'Harsh', 'Ishaan', 'Ishita', 'Jaya', 'Kabir',
  'Kavya', 'Lakshmi', 'Manish', 'Meera', 'Mohit', 'Nandini', 'Neha', 'Nikhil',
  'Omkar', 'Pavithra', 'Pranav', 'Priya', 'Rahul', 'Ramesh', 'Rehana', 'Riya',
  'Rohan', 'Sai', 'Sameer', 'Sanjana', 'Shreya', 'Siddharth', 'Sneha', 'Soham',
  'Sridhar', 'Tanvi', 'Tarun', 'Uday', 'Vaishnavi', 'Varun', 'Vikram', 'Vinay',
  'Yash', 'Zara', 'Aisha', 'Abhishek', 'Anjali', 'Deepak', 'Devika', 'Harshini',
  'Jatin', 'Kiran', 'Lavanya', 'Mohammed', 'Nikhila', 'Pooja', 'Ritika', 'Shyam',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Rao', 'Desai',
  'Kulkarni', 'Joshi', 'Mehta', 'Shah', 'Chauhan', 'Yadav', 'Prasad', 'Naidu',
  'Gupta', 'Singh', 'Khan', 'Ansari', 'Menon', 'Pillai', 'Bose', 'Ghosh',
  'Banerjee', 'Mukherjee', 'Trivedi', 'Pandey', 'Dubey', 'Agarwal', 'Saxena', 'Kapoor',
];

const random = mulberry32(hashSeed('sesa-dataset-v1'));
const dateOffset = (days) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const timeOffset = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();

/* ------------------------------------------------------------------ *
 * Students — 200 across 5 departments
 * ------------------------------------------------------------------ */
function buildStudents() {
  const students = [];
  let serial = 1;
  DEPARTMENTS.forEach((dept, deptIndex) => {
    // 14 second-years, 13 third-years, 13 fourth-years = 40 per department
    const yearPlan = [];
    for (let i = 0; i < 14; i += 1) yearPlan.push(2);
    for (let i = 0; i < 13; i += 1) yearPlan.push(3);
    for (let i = 0; i < 13; i += 1) yearPlan.push(4);

    yearPlan.forEach((year, index) => {
      const first = FIRST_NAMES[(serial * 5 + deptIndex * 11) % FIRST_NAMES.length];
      const last = LAST_NAMES[(serial * 13 + deptIndex * 7) % LAST_NAMES.length];
      const section = index % 2 === 0 ? 'A' : 'B';
      const rollNo = `${year}${dept.code}${String(11 + index).padStart(3, '0')}`;
      students.push({
        id: `S-${String(serial).padStart(4, '0')}`,
        rollNo,
        name: `${first} ${last}`,
        email: `${rollNo.toLowerCase()}@university.edu`,
        phone: `+91 9${String(800000000 + random() * 199999999).slice(0, 9)}`,
        department: dept.code,
        year,
        section,
        gender: index % 3 === 0 ? 'Male' : 'Female',
        prn: `PRN${String(22010000 + serial * 137).slice(0, 8)}`,
        photo: '',
        createdAt: new Date(Date.now() - (240 - serial) * 86400000).toISOString(),
      });
      serial += 1;
    });
  });
  return students;
}

/* ------------------------------------------------------------------ *
 * Halls — 8 examination halls
 * ------------------------------------------------------------------ */
const HALLS = [
  {
    id: 'H-1', code: 'A-101', name: 'Hall A-101', block: 'Academic Block A', floor: 1,
    capacity: 30, rows: 5, cols: 6, type: 'AC', board: 'Smart Board',
    facilities: ['Projector', 'Fans', 'Charging Points'], blockedSeats: [],
  },
  {
    id: 'H-2', code: 'A-102', name: 'Hall A-102', block: 'Academic Block A', floor: 1,
    capacity: 30, rows: 5, cols: 6, type: 'AC', board: 'Whiteboard',
    facilities: ['Projector', 'Clock'], blockedSeats: [{ row: 4, col: 5, reason: 'Damaged desk' }],
  },
  {
    id: 'H-3', code: 'A-201', name: 'Hall A-201', block: 'Academic Block A', floor: 2,
    capacity: 32, rows: 4, cols: 8, type: 'AC', board: 'Interactive Panel',
    facilities: ['Projector', 'Fans', 'Wi-Fi'], blockedSeats: [],
  },
  {
    id: 'H-4', code: 'B-104', name: 'Hall B-104', block: 'Academic Block B', floor: 1,
    capacity: 32, rows: 4, cols: 8, type: 'NON_AC', board: 'Whiteboard',
    facilities: ['Ceiling Fans', 'Clock'], blockedSeats: [],
  },
  {
    id: 'H-5', code: 'B-205', name: 'Hall B-205', block: 'Academic Block B', floor: 2,
    capacity: 36, rows: 6, cols: 6, type: 'AC', board: 'Smart Board',
    facilities: ['Projector', 'Ventilation', 'Charging Points'], blockedSeats: [],
  },
  {
    id: 'H-6', code: 'C-110', name: 'Hall C-110', block: 'Central Block', floor: 1,
    capacity: 36, rows: 6, cols: 6, type: 'AC', board: 'Interactive Panel',
    facilities: ['Projector', 'Audio System'], blockedSeats: [{ row: 0, col: 0, reason: 'Window sealed' }],
  },
  {
    id: 'H-7', code: 'C-301', name: 'Hall C-301', block: 'Central Block', floor: 3,
    capacity: 24, rows: 4, cols: 6, type: 'NON_AC', board: 'Whiteboard',
    facilities: ['Ceiling Fans'], blockedSeats: [],
  },
  {
    id: 'H-8', code: 'D-002', name: 'Seminar Hall D-002', block: 'Departmental Block', floor: 0,
    capacity: 24, rows: 4, cols: 6, type: 'AC', board: 'Large Display',
    facilities: ['Projector', 'Podium'], blockedSeats: [],
  },
];

/* ------------------------------------------------------------------ *
 * Exams — 5 schedules around today
 * ------------------------------------------------------------------ */
const EXAMS = [
  {
    id: 'EX-001', code: 'CS601', title: 'Operating Systems', subject: 'Operating Systems',
    course: 'B.Tech CSE', departments: ['CSE', 'IT'], years: [3, 4], minYear: 3,
    date: dateOffset(-9), startTime: '10:00', endTime: '13:00', durationHours: 3,
    status: 'COMPLETED', hallIds: ['H-1', 'H-2'], seatsPerHall: 30,
  },
  {
    id: 'EX-002', code: 'EC502', title: 'Digital Signal Processing', subject: 'Digital Signal Processing',
    course: 'B.Tech ECE', departments: ['ECE', 'MECH'], years: [3, 4], minYear: 3,
    date: dateOffset(-2), startTime: '09:30', endTime: '12:30', durationHours: 3,
    status: 'COMPLETED', hallIds: ['H-3', 'H-4'], seatsPerHall: 32,
  },
  {
    id: 'EX-003', code: 'ME401', title: 'Thermodynamics II', subject: 'Thermodynamics II',
    course: 'B.Tech MECH', departments: ['MECH', 'CIVIL'], years: [3, 4], minYear: 3,
    date: dateOffset(1), startTime: '14:00', endTime: '17:00', durationHours: 3,
    status: 'PUBLISHED', hallIds: ['H-5', 'H-6'], seatsPerHall: 36,
  },
  {
    id: 'EX-004', code: 'CE301', title: 'Structural Analysis', subject: 'Structural Analysis',
    course: 'B.Tech CIVIL', departments: ['CIVIL', 'MECH'], years: [2, 3], minYear: 2,
    date: dateOffset(4), startTime: '10:00', endTime: '13:00', durationHours: 3,
    status: 'SCHEDULED', hallIds: [], seatsPerHall: 36,
  },
  {
    id: 'EX-005', code: 'IT701', title: 'Cloud Computing', subject: 'Cloud Computing & DevOps',
    course: 'B.Tech IT', departments: ['CSE', 'IT', 'CIVIL'], years: [3, 4], minYear: 3,
    date: dateOffset(7), startTime: '09:30', endTime: '12:30', durationHours: 3,
    status: 'SCHEDULED', hallIds: [], seatsPerHall: 32,
  },
];

/* ------------------------------------------------------------------ *
 * Faculty
 * ------------------------------------------------------------------ */
const FACULTY = [
  { id: 'F-1001', name: 'Dr. Ananya Iyer', email: 'ananya.iyer@university.edu', department: 'CSE', designation: 'Professor & Head', employeeId: 'EMP-1001', phone: '+91 98200 11223', dutyPreference: 'MORNING', maxDutiesPerDay: 2, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1002', name: 'Dr. Imran Shaikh', email: 'imran.shaikh@university.edu', department: 'CSE', designation: 'Associate Professor', employeeId: 'EMP-1002', phone: '+91 98200 11224', dutyPreference: 'ANY', maxDutiesPerDay: 3, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1003', name: 'Prof. Ramesh Yadav', email: 'ramesh.yadav@university.edu', department: 'ECE', designation: 'Professor', employeeId: 'EMP-1003', phone: '+91 98200 11225', dutyPreference: 'EVENING', maxDutiesPerDay: 2, photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1004', name: 'Dr. Meera Nair', email: 'meera.nair@university.edu', department: 'IT', designation: 'Associate Professor', employeeId: 'EMP-1004', phone: '+91 98200 11226', dutyPreference: 'MORNING', maxDutiesPerDay: 2, photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1005', name: 'Dr. Sridhar Reddy', email: 'sridhar.reddy@university.edu', department: 'MECH', designation: 'Professor & Head', employeeId: 'EMP-1005', phone: '+91 98200 11227', dutyPreference: 'ANY', maxDutiesPerDay: 3, photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1006', name: 'Prof. Kavya Menon', email: 'kavya.menon@university.edu', department: 'CIVIL', designation: 'Assistant Professor', employeeId: 'EMP-1006', phone: '+91 98200 11228', dutyPreference: 'MORNING', maxDutiesPerDay: 2, photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1007', name: 'Dr. Aditya Joshi', email: 'aditya.joshi@university.edu', department: 'CSE', designation: 'Assistant Professor', employeeId: 'EMP-1007', phone: '+91 98200 11229', dutyPreference: 'EVENING', maxDutiesPerDay: 2, photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1008', name: 'Prof. Sneha Kulkarni', email: 'sneha.kulkarni@university.edu', department: 'ECE', designation: 'Assistant Professor', employeeId: 'EMP-1008', phone: '+91 98200 11230', dutyPreference: 'ANY', maxDutiesPerDay: 3, photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1009', name: 'Dr. Vikram Chauhan', email: 'vikram.chauhan@university.edu', department: 'MECH', designation: 'Associate Professor', employeeId: 'EMP-1009', phone: '+91 98200 11231', dutyPreference: 'MORNING', maxDutiesPerDay: 2, photo: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1010', name: 'Prof. Rehana Ansari', email: 'rehana.ansari@university.edu', department: 'IT', designation: 'Assistant Professor', employeeId: 'EMP-1010', phone: '+91 98200 11232', dutyPreference: 'ANY', maxDutiesPerDay: 3, photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1011', name: 'Dr. Sameer Patil', email: 'sameer.patil@university.edu', department: 'CIVIL', designation: 'Professor', employeeId: 'EMP-1011', phone: '+91 98200 11233', dutyPreference: 'EVENING', maxDutiesPerDay: 2, photo: 'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1012', name: 'Prof. Neha Bhosale', email: 'neha.bhosale@university.edu', department: 'CSE', designation: 'Assistant Professor', employeeId: 'EMP-1012', phone: '+91 98200 11234', dutyPreference: 'MORNING', maxDutiesPerDay: 2, photo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1013', name: 'Dr. Tarun Goyal', email: 'tarun.goyal@university.edu', department: 'MECH', designation: 'Associate Professor', employeeId: 'EMP-1013', phone: '+91 98200 11235', dutyPreference: 'ANY', maxDutiesPerDay: 3, photo: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=200&q=80' },
  { id: 'F-1014', name: 'Prof. Ishaan Kapoor', email: 'ishaan.kapoor@university.edu', department: 'IT', designation: 'Assistant Professor', employeeId: 'EMP-1014', phone: '+91 98200 11236', dutyPreference: 'EVENING', maxDutiesPerDay: 2, photo: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=200&q=80' },
];

const USERS = [
  {
    id: 'A-0001',
    name: 'Dr. Kavita Deshmukh',
    email: 'exam.officer@university.edu',
    password: 'admin123',
    role: 'ADMIN',
    title: 'Controller of Examinations',
    department: 'Examination Cell',
    employeeId: 'EMP-0001',
    phone: '+91 20 2555 0100',
    photo: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'F-1001',
    name: 'Dr. Ananya Iyer',
    email: 'ananya.iyer@university.edu',
    password: 'faculty123',
    role: 'FACULTY',
    title: 'Professor & Head',
    department: 'CSE',
    employeeId: 'EMP-1001',
    phone: '+91 98200 11223',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'F-1003',
    name: 'Prof. Ramesh Yadav',
    email: 'ramesh.yadav@university.edu',
    password: 'faculty123',
    role: 'FACULTY',
    title: 'Professor',
    department: 'ECE',
    employeeId: 'EMP-1003',
    phone: '+91 98200 11225',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
  },
];

/* ------------------------------------------------------------------ *
 * Seeding
 * ------------------------------------------------------------------ */
export function seedDatabase() {
  const students = buildStudents();
  const halls = HALLS.map((h) => ({ ...h, blockedSeats: h.blockedSeats ?? [] }));
  const exams = EXAMS.map((e) => ({ ...e }));
  const faculty = FACULTY.map((f) => ({ ...f }));
  const users = USERS.map((u) => ({ ...u }));

  // --- Pre-generate plans so the Hall Plan viewer has data on first load ---
  const plans = [];
  // Rule keys mirror the backend's `SeatingRulesRequest`. `balanceAcrossHalls`
  // was here until the key was dropped as server-unknown; the local engine now
  // always orders halls smallest-first instead.
  const seedConfigs = [
    { examId: 'EX-001', hallIds: ['H-1', 'H-2'], rules: { avoidSameDeptAdjacent: true, avoidSameDeptDiagonal: true } },
    { examId: 'EX-002', hallIds: ['H-3', 'H-4'], rules: { avoidSameDeptAdjacent: true, avoidSameDeptDiagonal: true } },
    { examId: 'EX-003', hallIds: ['H-5', 'H-6'], rules: { avoidSameDeptAdjacent: true, avoidSameDeptDiagonal: true, shuffle: true } },
  ];
  seedConfigs.forEach((config) => {
    const { plans: generated } = generateSeatingPlan({ students, halls, exams }, config);
    generated.forEach((plan, index) => {
      if (index === 0 && config.examId !== 'EX-003') {
        plan.status = 'PUBLISHED';
        plan.publishedAt = new Date(Date.now() - 86400000).toISOString();
      }
      plans.push(plan);
    });
  });
  exams.forEach((exam) => {
    exam.hallIds = [...new Set(plans.filter((p) => p.examId === exam.id).map((p) => p.hallId))];
  });

  // --- Invigilation duties (mostly upcoming, a few historical) ---
  const dutyPlan = [
    ['F-1001', 'EX-003', 'H-5', -2, '14:00', '17:00', 'CHIEF_INVIGILATOR', 'COMPLETED'],
    ['F-1002', 'EX-003', 'H-5', -2, '14:00', '17:00', 'INVIGILATOR', 'COMPLETED'],
    ['F-1003', 'EX-003', 'H-6', -2, '14:00', '17:00', 'CHIEF_INVIGILATOR', 'COMPLETED'],
    ['F-1001', 'EX-004', 'H-5', 4, '10:00', '13:00', 'CHIEF_INVIGILATOR', 'ASSIGNED'],
    ['F-1002', 'EX-004', 'H-5', 4, '10:00', '13:00', 'INVIGILATOR', 'ASSIGNED'],
    ['F-1003', 'EX-004', 'H-6', 4, '10:00', '13:00', 'INVIGILATOR', 'ASSIGNED'],
    ['F-1001', 'EX-005', 'H-3', 7, '09:30', '12:30', 'CHIEF_INVIGILATOR', 'ASSIGNED'],
    ['F-1004', 'EX-005', 'H-3', 7, '09:30', '12:30', 'INVIGILATOR', 'ASSIGNED'],
    ['F-1007', 'EX-005', 'H-4', 7, '09:30', '12:30', 'INVIGILATOR', 'ASSIGNED'],
    ['F-1001', 'EX-005', 'H-4', 7, '09:30', '12:30', 'EXTERNAL_SUPERVISOR', 'ASSIGNED'],
    ['F-1005', 'EX-004', 'H-7', 4, '10:00', '13:00', 'INVIGILATOR', 'ASSIGNED'],
    ['F-1006', 'EX-005', 'H-1', 7, '09:30', '12:30', 'INVIGILATOR', 'ASSIGNED'],
  ];
  const duties = dutyPlan.map(([facultyId, examId, hallId, offset, startTime, endTime, role, status], index) => {
    const exam = exams.find((e) => e.id === examId);
    const hall = halls.find((h) => h.id === hallId);
    const person = faculty.find((f) => f.id === facultyId);
    return {
      id: `D-${String(index + 1).padStart(3, '0')}`,
      facultyId,
      facultyName: person.name,
      facultyEmail: person.email,
      examId,
      examTitle: exam.title,
      examCode: exam.code,
      subject: exam.subject,
      hallId,
      hallName: hall.name,
      date: dateOffset(offset),
      startTime,
      endTime,
      role,
      status,
      seatCount: plans.find((p) => p.examId === examId && p.hallId === hallId)?.stats.allocated ?? hall.capacity,
    };
  });

  const activity = [
    { id: 'AC-1', type: 'generate', title: 'Seating plan generated', detail: 'EX-003 · Thermodynamics II · 2 halls', at: timeOffset(-42), actor: 'Dr. K. Deshmukh' },
    { id: 'AC-2', type: 'upload', title: 'Student list imported', detail: '184 rows uploaded from semester_4.xlsx', at: timeOffset(-320), actor: 'System' },
    { id: 'AC-3', type: 'duty', title: 'Invigilation duty assigned', detail: 'Dr. Imran Shaikh → Hall B-205', at: timeOffset(-1400), actor: 'Dr. K. Deshmukh' },
    { id: 'AC-4', type: 'publish', title: 'Hall plan published', detail: 'EX-002 · Digital Signal Processing', at: timeOffset(-2900), actor: 'System' },
    { id: 'AC-5', type: 'exam', title: 'New exam scheduled', detail: 'IT701 · Cloud Computing · +7 days', at: timeOffset(-7000), actor: 'Dr. K. Deshmukh' },
    { id: 'AC-6', type: 'swap', title: 'Manual seat swap', detail: 'H-3 · R2C4 ⇄ R2C7 (back row adjustment)', at: timeOffset(-10800), actor: 'Dr. K. Deshmukh' },
    { id: 'AC-7', type: 'hall', title: 'Hall capacity updated', detail: 'Seminar Hall D-002 · 24 → 24 seats', at: timeOffset(-20000), actor: 'Estate Manager' },
  ];

  const notifications = [
    { id: 'N-1', type: 'duty', title: 'Duty reminder', body: 'Your duty in Hall B-205 starts tomorrow at 10:00 AM.', at: timeOffset(-60), read: false, href: '/faculty/duties' },
    { id: 'N-2', type: 'plan', title: 'Hall plan published', body: 'Thermodynamics II seating plan is now live for 72 students.', at: timeOffset(-240), read: false, href: '/faculty/hall-plan' },
    { id: 'N-3', type: 'exam', title: 'Exam schedule updated', body: 'CE301 Structural Analysis moved to Hall B-205 and D-002.', at: timeOffset(-1500), read: false, href: '/faculty/duties' },
    { id: 'N-4', type: 'result', title: 'Attendance sheet ready', body: 'Attendance summary for Digital Signal Processing is available.', at: timeOffset(-2900), read: true, href: '/faculty/attendance' },
    { id: 'N-5', type: 'duty', title: 'Duty reassigned', body: 'You were moved from Hall A-101 to Hall C-301.', at: timeOffset(-9000), read: true, href: '/faculty/duties' },
    { id: 'N-6', type: 'system', title: 'New device sign-in', body: 'Signed in from Chrome on Windows 11.', at: timeOffset(-13000), read: true, href: '/faculty/profile' },
  ];

  const settings = {
    theme: 'light',
    density: 'comfortable',
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    weeklyDigest: true,
    clashAlerts: true,
    autoPublish: false,
    language: 'English',
    institution: 'Prestige Institute of Technology',
    academicYear: '2026–27',
  };

  /* ---------------- derived report helpers ---------------- */
  const planFor = (examId, hallId) => plans.find((p) => p.examId === examId && p.hallId === hallId);
  const plansForExam = (examId) => plans.filter((p) => p.examId === examId);
  const effectiveExamId = (examId) => {
    if (examId && plansForExam(examId).length) return examId;
    const completed = exams.filter((e) => plansForExam(e.id).length);
    return completed[completed.length - 1]?.id ?? exams[0].id;
  };

  const db = {
    students,
    halls,
    exams,
    faculty,
    users,
    duties,
    plans,
    activity,
    notifications,
    settings,
  };

  db.hallReport = (examId) => {
    const id = effectiveExamId(examId);
    const exam = exams.find((e) => e.id === id);
    const rows = plansForExam(id).map((plan) => ({
      examCode: exam.code,
      examTitle: exam.title,
      hallCode: plan.hallCode,
      hallName: plan.hallName,
      capacity: plan.stats.capacity,
      allocated: plan.stats.allocated,
      utilisation: plan.stats.utilisation,
      invigilators: duties.filter((d) => d.examId === id && d.hallId === plan.hallId).length,
      departments: plan.stats.departments,
      status: plan.status,
    }));
    return { exam, rows, totals: { halls: rows.length, allocated: rows.reduce((s, r) => s + r.allocated, 0) } };
  };

  db.departmentReport = (examId) => {
    const id = effectiveExamId(examId);
    const exam = exams.find((e) => e.id === id);
    const rows = DEPARTMENTS.map((dept) => {
      const eligible = students.filter(
        (s) => s.department === dept.code && exam.departments.includes(s.department) && s.year >= exam.minYear
      );
      const seated = plansForExam(id).reduce(
        (sum, plan) => sum + (plan.stats.departments[dept.code] ?? 0),
        0
      );
      const hallsUsed = plansForExam(id).filter((p) => (p.stats.departments[dept.code] ?? 0) > 0).length;
      return {
        department: dept.code,
        departmentName: dept.name,
        color: dept.color,
        eligible: eligible.length,
        allocated: seated,
        unallocated: Math.max(0, eligible.length - seated),
        hallsUsed,
        share: eligible.length ? Math.round((seated / eligible.length) * 100) : 0,
      };
    });
    return { exam, rows };
  };

  db.studentReport = (examId) => {
    const id = effectiveExamId(examId);
    const rows = [];
    plansForExam(id).forEach((plan) => {
      plan.seats.forEach((row) =>
        row.forEach((seat) => {
          if (!seat.studentId) return;
          rows.push({
            rollNo: seat.rollNo,
            name: seat.name,
            department: seat.department,
            year: seat.year,
            section: seat.section,
            hall: plan.hallCode,
            seat: `${String.fromCharCode(65 + seat.row)}${seat.col + 1}`,
            status: plan.status === 'PUBLISHED' ? 'CONFIRMED' : 'PROVISIONAL',
          });
        })
      );
    });
    return rows.sort((a, b) => a.rollNo.localeCompare(b.rollNo));
  };

  db.attendanceSheet = (examId, hallId) => {
    const id = effectiveExamId(examId);
    const hallPlans = hallId ? plans.filter((p) => p.examId === id && p.hallId === hallId) : plansForExam(id);
    const exam = exams.find((e) => e.id === id);
    const rows = [];
    hallPlans.forEach((plan) => {
      plan.seats.forEach((row) =>
        row.forEach((seat) => {
          if (!seat.studentId) return;
          rows.push({
            rollNo: seat.rollNo,
            name: seat.name,
            department: seat.department,
            year: seat.year,
            section: seat.section,
            hall: plan.hallName,
            hallCode: plan.hallCode,
            seat: `${String.fromCharCode(65 + seat.row)}${seat.col + 1}`,
            present: Math.abs(hashSeed(seat.rollNo)) % 10 > 1,
          });
        })
      );
    });
    return {
      exam,
      halls: hallPlans.map((p) => ({ id: p.hallId, name: p.hallName })),
      rows,
      summary: {
        total: rows.length,
        present: rows.filter((r) => r.present).length,
        absent: rows.filter((r) => !r.present).length,
      },
    };
  };

  db.adminDashboard = () => {
    const upcoming = exams
      .filter((e) => new Date(e.date) >= new Date(new Date().toDateString()))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);

    const allocationsOverTime = Array.from({ length: 12 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - index));
      return {
        month: date.toLocaleString('en-IN', { month: 'short' }),
        seats: Math.round(120 + Math.sin(index) * 26 + index * 22 + random() * 14),
        students: Math.round(105 + index * 18 + Math.cos(index * 0.9) * 18),
      };
    });

    const departmentDistribution = DEPARTMENTS.map((dept) => ({
      name: dept.short,
      value: students.filter((s) => s.department === dept.code).length,
      color: dept.color,
    }));

    const hallUtilisation = halls.map((hall) => {
      const plan = plans.find((p) => p.hallId === hall.id);
      return {
        hall: hall.code,
        utilisation: plan?.stats.utilisation ?? Math.round(55 + random() * 35),
      };
    });

    const clashes = plans.reduce((sum, p) => sum + p.verification.clashes, 0);

    return {
      stats: {
        totalStudents: students.length,
        totalHalls: halls.length,
        examsScheduled: exams.filter((e) => e.status !== 'COMPLETED').length,
        seatsAllocated: plans.reduce((sum, p) => sum + p.stats.allocated, 0),
        totalCapacity: halls.reduce((sum, h) => sum + h.capacity, 0),
        facultyCount: faculty.length,
        activePlans: plans.length,
        clashes,
        avgUtilisation: Math.round(
          plans.reduce((sum, p) => sum + p.stats.utilisation, 0) / Math.max(1, plans.length)
        ),
      },
      allocationsOverTime,
      departmentDistribution,
      hallUtilisation,
      upcoming,
      activity: activity.slice(0, 6),
      examsByStatus: [
        { name: 'Scheduled', value: exams.filter((e) => e.status === 'SCHEDULED').length, color: '#4F46E5' },
        { name: 'Published', value: exams.filter((e) => e.status === 'PUBLISHED').length, color: '#14B8A6' },
        { name: 'Completed', value: exams.filter((e) => e.status === 'COMPLETED').length, color: '#F59E0B' },
      ],
    };
  };

  db.facultyDashboard = (email) => {
    const person = faculty.find((f) => f.email === email) ?? faculty[0];
    const mine = duties.filter((d) => d.facultyEmail === person.email);
    const today = new Date().toDateString();
    const todayDuty = mine.find((d) => new Date(d.date).toDateString() === today) ?? null;
    const nextDuty = mine
      .filter((d) => new Date(d.date) > new Date(today))
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const month = new Date().getMonth();
    const completedThisSemester = mine.filter((d) => d.status === 'COMPLETED').length;

    return {
      faculty: person,
      stats: {
        upcomingDuties: mine.filter((d) => d.status !== 'COMPLETED').length,
        completedDuties: completedThisSemester,
        studentsInvigilated: mine.reduce((sum, d) => sum + d.seatCount, 0),
        hallsCovered: new Set(mine.map((d) => d.hallId)).size,
      },
      todayDuty,
      nextDuty,
      upcoming: mine
        .filter((d) => d.status !== 'COMPLETED')
        .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
        .slice(0, 5),
      dutyTrend: Array.from({ length: 6 }, (_, index) => ({
        month: new Date(month - (5 - index), 1).toLocaleString('en-IN', { month: 'short' }),
        duties: [2, 4, 3, 5, 4, mine.length][index],
      })),
      workload: DEPARTMENTS.map((dept) => ({
        name: dept.short,
        value: mine.filter((d) => {
          const plan = plans.find((p) => p.examId === d.examId && p.hallId === d.hallId);
          return plan?.stats.departments[dept.code] > 0;
        }).length,
        color: dept.color,
      })),
      notifications,
    };
  };

  return db;
}

/**
 * Seeded accounts from `backend/src/main/java/com/examseat/config/DataSeeder.java`.
 * The login page offers these as one-click fills so the app can be demoed
 * without memorising credentials. They only exist because the backend seeds
 * demo data — drop the seeder and this list goes away with it.
 */
export const demoAccounts = [
  {
    role: 'Examination Department',
    roleKey: 'ADMIN',
    email: 'admin@exam.com',
    password: 'admin123',
    description: 'Full access - students, halls, exams, generation, reports.',
  },
  {
    role: 'Faculty',
    roleKey: 'FACULTY',
    email: 'faculty1@exam.com',
    password: 'faculty123',
    description: 'Duties, hall plan and attendance for assigned halls.',
  },
];

export { HALLS, EXAMS, FACULTY, USERS, dateOffset };