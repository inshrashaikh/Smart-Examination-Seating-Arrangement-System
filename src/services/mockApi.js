/**
 * Mock API — an in-memory stand-in for the Spring Boot controllers.
 * Every function mirrors a real endpoint so the UI can run with zero backend.
 * All calls resolve after a small artificial latency to exercise skeletons.
 */
import { seedDatabase } from '../data/mockDatabase';
import { generateSeatingPlan } from '../utils/seating';

let db = null;
const ensure = () => {
  if (!db) db = seedDatabase();
  return db;
};

export const delay = (ms = 320) => new Promise((resolve) => setTimeout(resolve, ms));
export const nextId = (list) => (list.length ? Math.max(...list.map((i) => Number(i.id) || 0)) + 1 : 1);

/* ----------------------------- auth ----------------------------- */
export const authApi = {
  async login({ email, password, role }) {
    await delay(700);
    const state = ensure();
    const user = state.users.find(
      (u) => u.email.toLowerCase() === String(email).trim().toLowerCase()
    );
    if (user && user.password !== password) {
      throw { message: 'Incorrect password. Please try again.', status: 401 };
    }
    const resolved =
      user ||
      (role === 'FACULTY'
        ? {
            id: 'F-1042',
            name: email.split('@')[0].replace(/[._]/g, ' '),
            email,
            role: 'FACULTY',
            department: 'CSE',
            designation: 'Associate Professor',
            employeeId: 'EMP-1042',
            password,
            avatar: '',
          }
        : {
            id: 'A-0001',
            name: 'Examination Officer',
            email,
            role: 'ADMIN',
            department: 'Examination Cell',
            designation: 'Controller of Examinations',
            employeeId: 'EMP-0001',
            password,
            avatar: '',
          });
    return { token: `mock-token-${resolved.role}-${Date.now()}`, user: resolved };
  },
  async me() {
    await delay(180);
    return null;
  },
  async logout() {
    await delay(150);
    return { message: 'Signed out' };
  },
};

/* --------------------------- students ---------------------------- */
export const studentsApi = {
  async list({ search = '', department = 'ALL', year = 'ALL', page = 1, pageSize = 10, sortBy, sortDir } = {}) {
    await delay(260);
    let rows = [...ensure().students];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.rollNo.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    if (department !== 'ALL') rows = rows.filter((s) => s.department === department);
    if (year !== 'ALL') rows = rows.filter((s) => String(s.year) === String(year));
    if (sortBy) {
      rows.sort((a, b) => {
        const av = a[sortBy];
        const bv = b[sortBy];
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }
    const total = rows.length;
    const start = (page - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
  async get(id) {
    await delay(180);
    return ensure().students.find((s) => s.id === id) ?? null;
  },
  async create(payload) {
    await delay(420);
    const state = ensure();
    const student = {
      ...payload,
      id: String(nextId(state.students)),
      rollNo: payload.rollNo || `NEW${String(nextId(state.students)).padStart(4, '0')}`,
      avatar: '',
      createdAt: new Date().toISOString(),
    };
    state.students.push(student);
    return student;
  },
  async update(id, payload) {
    await delay(420);
    const state = ensure();
    const index = state.students.findIndex((s) => s.id === id);
    if (index === -1) throw { message: 'Student not found', status: 404 };
    state.students[index] = { ...state.students[index], ...payload };
    return state.students[index];
  },
  async remove(id) {
    await delay(360);
    const state = ensure();
    state.students = state.students.filter((s) => s.id !== id);
    return { message: 'Student deleted' };
  },
  async upload(rows = []) {
    // Emulated chunked progress is handled by the upload component; here we just ingest.
    await delay(900);
    const state = ensure();
    let added = 0;
    rows.forEach((row) => {
      if (!row?.rollNo || state.students.some((s) => s.rollNo === row.rollNo)) return;
      state.students.push({
        id: String(nextId(state.students)),
        name: row.name || 'Unnamed Student',
        rollNo: row.rollNo,
        email: row.email || `${String(row.rollNo).toLowerCase()}@college.edu`,
        department: (row.department || 'CSE').toUpperCase(),
        year: Number(row.year) || 1,
        section: row.section || 'A',
        gender: row.gender || 'Female',
        phone: row.phone || '',
        avatar: '',
        createdAt: new Date().toISOString(),
      });
      added += 1;
    });
    return { total: rows.length, added, duplicates: rows.length - added };
  },
};

/* ----------------------------- halls ----------------------------- */
export const hallsApi = {
  async list() {
    await delay(240);
    return ensure().halls.map((h) => ({ ...h, allocated: ensure().plans.filter((p) => p.hallId === h.id).length > 0 }));
  },
  async get(id) {
    await delay(160);
    return ensure().halls.find((h) => h.id === id) ?? null;
  },
  async create(payload) {
    await delay(420);
    const state = ensure();
    const hall = { ...payload, id: `H-${nextId(state.halls)}` };
    state.halls.push(hall);
    return hall;
  },
  async update(id, payload) {
    await delay(420);
    const state = ensure();
    const index = state.halls.findIndex((h) => h.id === id);
    if (index === -1) throw { message: 'Hall not found', status: 404 };
    state.halls[index] = { ...state.halls[index], ...payload };
    return state.halls[index];
  },
  async remove(id) {
    await delay(360);
    const state = ensure();
    state.halls = state.halls.filter((h) => h.id !== id);
    return { message: 'Hall deleted' };
  },
};

/* ----------------------------- exams ----------------------------- */
export const examsApi = {
  async list() {
    await delay(260);
    return ensure().exams;
  },
  async get(id) {
    await delay(160);
    return ensure().exams.find((e) => e.id === id) ?? null;
  },
  async create(payload) {
    await delay(460);
    const state = ensure();
    const exam = {
      ...payload,
      id: `EX-${String(nextId(state.exams)).padStart(3, '0')}`,
      status: 'SCHEDULED',
      createdAt: new Date().toISOString(),
    };
    state.exams.push(exam);
    return exam;
  },
  async update(id, payload) {
    await delay(420);
    const state = ensure();
    const index = state.exams.findIndex((e) => e.id === id);
    if (index === -1) throw { message: 'Exam not found', status: 404 };
    state.exams[index] = { ...state.exams[index], ...payload };
    return state.exams[index];
  },
  async remove(id) {
    await delay(360);
    const state = ensure();
    state.exams = state.exams.filter((e) => e.id !== id);
    return { message: 'Exam deleted' };
  },
};

/* ---------------------------- seating ---------------------------- */
export const seatingApi = {
  async generate({ examId, hallIds, rules, departments }) {
    await delay(1500);
    const state = ensure();
    return generateSeatingPlan(state, { examId, hallIds, rules, departments });
  },
  async list({ examId } = {}) {
    await delay(260);
    const state = ensure();
    if (!examId) return state.plans;
    return state.plans.filter((p) => p.examId === examId);
  },
  async get(planId) {
    await delay(220);
    return ensure().plans.find((p) => p.id === planId) ?? null;
  },
  async swap(planId, seatA, seatB) {
    await delay(300);
    const state = ensure();
    const plan = state.plans.find((p) => p.id === planId);
    if (!plan) throw { message: 'Plan not found', status: 404 };
    const [a, b] = [plan.seats[seatA.row]?.[seatA.col], plan.seats[seatB.row]?.[seatB.col]];
    if (!a || !b) throw { message: 'Seat not found', status: 404 };
    const holder = plan.seats[seatA.row][seatA.col];
    plan.seats[seatA.row][seatA.col] = { ...b, row: seatA.row, col: seatA.col };
    plan.seats[seatB.row][seatB.col] = { ...holder, row: seatB.row, col: seatB.col };
    plan.history.push({
      id: `SW-${Date.now()}`,
      at: new Date().toISOString(),
      action: 'Manual swap',
      detail: `${a.rollNo} ⇄ ${b.rollNo}`,
    });
    return plan;
  },
  async publish(planId) {
    await delay(500);
    const state = ensure();
    const plan = state.plans.find((p) => p.id === planId);
    if (!plan) throw { message: 'Plan not found', status: 404 };
    plan.status = 'PUBLISHED';
    plan.publishedAt = new Date().toISOString();
    state.activity.unshift({
      id: `A-${Date.now()}`,
      type: 'publish',
      title: 'Hall plan published',
      detail: `${plan.examTitle} · ${plan.hallName}`,
      at: new Date().toISOString(),
      actor: 'You',
    });
    return plan;
  },
};

/* ---------------------------- reports ---------------------------- */
export const reportsApi = {
  async hallWise({ examId } = {}) {
    await delay(520);
    const state = ensure();
    return state.hallReport(examId);
  },
  async departmentWise({ examId } = {}) {
    await delay(520);
    const state = ensure();
    return state.departmentReport(examId);
  },
  async studentWise({ examId, search = '' } = {}) {
    await delay(520);
    const state = ensure();
    let rows = state.studentReport(examId);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(q) || r.rollNo.toLowerCase().includes(q)
      );
    }
    return rows;
  },
  async attendance({ examId, hallId } = {}) {
    await delay(480);
    const state = ensure();
    return state.attendanceSheet(examId, hallId);
  },
};

/* ---------------------------- faculty ---------------------------- */
export const facultyApi = {
  async list() {
    await delay(260);
    return ensure().faculty;
  },
  async assignDuty({ facultyId, examId, hallId, date, startTime, endTime, role }) {
    await delay(520);
    const state = ensure();
    const person = state.faculty.find((f) => f.id === facultyId);
    const exam = state.exams.find((e) => e.id === examId);
    const hall = state.halls.find((h) => h.id === hallId);
    const duty = {
      id: `D-${String(nextId(state.duties)).padStart(3, '0')}`,
      facultyId,
      facultyName: person?.name ?? 'Faculty',
      facultyEmail: person?.email ?? '',
      facultyDepartment: person?.department ?? '',
      examId,
      examTitle: exam?.title ?? 'Exam',
      examCode: exam?.code ?? '',
      subject: exam?.subject ?? '',
      hallId,
      hallName: hall?.name ?? '',
      hallCode: hall?.code ?? '',
      date,
      startTime,
      endTime,
      role: role || 'INVIGILATOR',
      status: 'ASSIGNED',
      seatCount: state.plans.find((p) => p.examId === examId && p.hallId === hallId)?.stats.allocated ?? hall?.capacity ?? 0,
      assignedAt: new Date().toISOString(),
    };
    state.duties.push(duty);
    state.activity.unshift({
      id: `A-${Date.now()}`,
      type: 'duty',
      title: 'Invigilation duty assigned',
      detail: `${duty.facultyName} → ${duty.hallName} · ${duty.role.replace(/_/g, ' ').toLowerCase()}`,
      at: new Date().toISOString(),
      actor: 'You',
    });
    return duty;
  },
  async removeDuty(id) {
    await delay(320);
    const state = ensure();
    state.duties = state.duties.filter((d) => d.id !== id);
    return { message: 'Duty removed' };
  },
  async myDuties(email) {
    await delay(300);
    const state = ensure();
    const me = state.users.find((u) => u.email === email);
    const mine = state.duties.filter((d) => !me || d.facultyEmail === email);
    const byName = state.duties.filter((d) => me && d.facultyName === me.name);
    const rows = mine.length ? mine : byName;
    return rows.length
      ? rows
      : state.duties.filter((d) => ['Dr. Ananya Iyer', 'Dr. Imran Shaikh'].includes(d.facultyName));
  },
};

/* ------------------------- dashboard & misc ---------------------- */
export const dashboardApi = {
  async admin() {
    await delay(340);
    return ensure().adminDashboard();
  },
  async faculty(email) {
    await delay(340);
    return ensure().facultyDashboard(email);
  },
  async activity() {
    await delay(200);
    return ensure().activity;
  },
  async notifications(email) {
    await delay(240);
    return ensure().notifications;
  },
  /** Marks one notification read in the in-memory store. */
  async markNotificationRead(id) {
    await delay(140);
    const target = ensure().notifications.find((n) => n.id === id);
    if (target) target.read = true;
    return target ?? { id, read: true };
  },
  async markAllNotificationsRead() {
    await delay(180);
    ensure().notifications.forEach((n) => {
      n.read = true;
    });
    return ensure().notifications;
  },
  async updateSettings(payload) {
    await delay(360);
    const state = ensure();
    state.settings = { ...state.settings, ...payload };
    return state.settings;
  },
};

export default {
  auth: authApi,
  students: studentsApi,
  halls: hallsApi,
  exams: examsApi,
  seating: seatingApi,
  reports: reportsApi,
  faculty: facultyApi,
  dashboard: dashboardApi,
};