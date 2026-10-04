import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  studentService,
  hallService,
  examService,
  facultyService,
  seatingService,
  dashboardService,
} from '../services';
import { useAuth } from './AuthContext';

/**
 * Shared entity store.
 *
 * One fetch per collection on login, then mutations patch local state so every
 * screen stays in sync without pulling in a state library. Nothing here knows
 * about URLs — it calls services, which are the only layer that does.
 *
 * `refreshAll` deliberately swallows per-collection failures into empty lists:
 * a faculty member is scoped server-side to their own duties, so several of
 * these legitimately 403 for them. The aggregate error is surfaced separately
 * so the UI can offer a retry.
 */

/** Page size used to hydrate the client-side collections (200 seeded students). */
const HYDRATE_SIZE = 500;

const EMPTY = {
  students: [],
  halls: [],
  exams: [],
  faculty: [],
  plans: [],
  duties: [],
};

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { isAuthenticated, role } = useAuth();
  const [students, setStudents] = useState(EMPTY.students);
  const [halls, setHalls] = useState(EMPTY.halls);
  const [exams, setExams] = useState(EMPTY.exams);
  const [faculty, setFaculty] = useState(EMPTY.faculty);
  const [plans, setPlans] = useState(EMPTY.plans);
  const [duties, setDuties] = useState(EMPTY.duties);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetches every collection the dashboards need.
   * `Promise.allSettled` so one 403 cannot blank the whole app.
   *
   * Duties are role-dependent because the two roles read different resources:
   *  - ADMIN   → `GET /api/duties`  (the whole roster, for the Faculty page)
   *  - FACULTY → `GET /api/duties/my` (duty-scoped, which is all they may see)
   *
   * Both return a bare array, and the rest of the app only ever reads `duties`
   * as "the duty roster for whoever is signed in", so no call site has to care
   * which one produced it.
   */
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const requests = [
      studentService.getAll({ page: 0, size: HYDRATE_SIZE, skipErrorToast: true }),
      hallService.getAll(),
      examService.getAll(),
      facultyService.getAll(),
      seatingService.list(),
      role === 'FACULTY' ? facultyService.getMyDuties() : facultyService.getAllDuties(),
    ];

    const [s, h, e, f, p, d] = await Promise.allSettled(requests);

    if (s.status === 'fulfilled') setStudents(s.value?.items ?? []);
    if (h.status === 'fulfilled') setHalls(h.value ?? []);
    if (e.status === 'fulfilled') setExams(e.value ?? []);
    if (f.status === 'fulfilled') setFaculty(f.value ?? []);
    if (p.status === 'fulfilled') setPlans(p.value ?? []);
    if (d.status === 'fulfilled') setDuties(d.value ?? []);

    // Only a genuine outage is worth reporting; 403s are expected for faculty.
    const outage = [s, h, e, f, p, d].find((r) => r.status === 'rejected' && r.reason?.status === 0);
    if (outage) setError(outage.reason);

    setLoaded(true);
    setLoading(false);
    return { s, h, e, f, p, d };
  }, [role]);

  useEffect(() => {
    if (isAuthenticated && !loaded) refreshAll();
  }, [isAuthenticated, loaded, refreshAll]);

  /* ----------------------------- students ----------------------------- */
  const addStudent = useCallback(async (payload) => {
    const created = await studentService.create(payload);
    setStudents((prev) => [created, ...prev]);
    return created;
  }, []);

  const editStudent = useCallback(async (id, payload) => {
    const updated = await studentService.update(id, payload);
    setStudents((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);

  const deleteStudent = useCallback(async (id) => {
    await studentService.remove(id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /**
   * Bulk import. Takes a real `File` so the server does the parsing and
   * returns row-level validation errors; see BulkUploadModal.
   */
  const bulkImport = useCallback(
    async (file, onProgress) => {
      const result = await studentService.uploadFile(file, onProgress);
      const fresh = await studentService.getAll({ page: 0, size: HYDRATE_SIZE });
      setStudents(fresh.items ?? []);
      return result;
    },
    []
  );

  /** Demo-mode path: ingest already-parsed rows. */
  const bulkImportRows = useCallback(async (rows) => {
    const result = await studentService.uploadRows(rows);
    const fresh = await studentService.getAll({ page: 0, size: HYDRATE_SIZE });
    setStudents(fresh.items ?? []);
    return result;
  }, []);

  /* ------------------------------ halls ------------------------------- */
  const addHall = useCallback(async (payload) => {
    const created = await hallService.create(payload);
    setHalls((prev) => [...prev, created]);
    return created;
  }, []);

  const editHall = useCallback(async (id, payload) => {
    const updated = await hallService.update(id, payload);
    setHalls((prev) => prev.map((h) => (h.id === id ? updated : h)));
    return updated;
  }, []);

  const deleteHall = useCallback(async (id) => {
    await hallService.remove(id);
    setHalls((prev) => prev.filter((h) => h.id !== id));
  }, []);

  /* ------------------------------ exams ------------------------------- */
  const addExam = useCallback(async (payload) => {
    const created = await examService.create(payload);
    setExams((prev) => [...prev, created]);
    return created;
  }, []);

  const editExam = useCallback(async (id, payload) => {
    const updated = await examService.update(id, payload);
    setExams((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const deleteExam = useCallback(async (id) => {
    await examService.remove(id);
    setExams((prev) => prev.filter((e) => e.id !== id));
  }, []);

  /* --------------------------- seating plans --------------------------- */

  /**
   * Replaces every plan for the affected exams with the freshly generated ones.
   *
   * Note the backend emits a `HallAllocation` for *every* requested hall, even
   * ones that ended up with zero seats, so `halls.length` is not the same as
   * "halls with students".
   */
  const applyGeneration = useCallback((generation) => {
    const newPlans = (generation?.halls ?? []).map((hall) => toPlanSummary(hall, generation));
    if (!newPlans.length) return [];

    const examId = generation.examId;
    setPlans((prev) => [...prev.filter((p) => p.examId !== examId), ...newPlans]);
    setExams((prev) =>
      prev.map((exam) =>
        exam.id === examId
          ? {
              ...exam,
              status: 'ALLOCATED',
              allocatedSeats: generation.totalSeated ?? exam.allocatedSeats,
              hallIds: newPlans.map((p) => p.hallId),
            }
          : exam
      )
    );
    return newPlans;
  }, []);

  const replacePlan = useCallback((plan) => {
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
  }, []);

  const publishPlan = useCallback(async (planId) => {
    const published = await seatingService.publish(planId);
    replacePlan(published);
    setExams((prev) =>
      prev.map((e) => (e.id === published.examId ? { ...e, status: published.status } : e))
    );
    return published;
  }, [replacePlan]);

  /**
   * Swaps two seats. Deliberately *not* optimistic: the backend re-validates
   * adjacency and answers 409 for an illegal swap, so the grid must only move
   * once the server has confirmed. The returned plan is the server's own copy.
   */
  const swapSeats = useCallback(
    async (planId, seatA, seatB, options = {}) => {
      const updated = await seatingService.swap(planId, seatA, seatB, options);
      if (updated) replacePlan(updated);
      return updated;
    },
    [replacePlan]
  );

  const resetExam = useCallback(async (examId) => {
    await seatingService.reset(examId);
    setPlans((prev) => prev.filter((p) => p.examId !== examId));
    setExams((prev) =>
      prev.map((e) =>
        e.id === examId ? { ...e, status: 'SCHEDULED', allocatedSeats: 0, hallIds: [] } : e
      )
    );
  }, []);

  /* ------------------------------ duties ------------------------------ */
  const loadDuties = useCallback(async () => {
    const rows = await facultyService.getMyDuties();
    setDuties(Array.isArray(rows) ? rows : []);
    return rows;
  }, []);

  const addDuty = useCallback(async (payload) => {
    const duty = await facultyService.assignDuty(payload);
    setDuties((prev) => [...prev, duty]);
    return duty;
  }, []);

  const removeDuty = useCallback(async (id) => {
    await facultyService.removeDuty(id);
    setDuties((prev) => prev.filter((d) => d.id !== id));
  }, []);

  /* ------------------------------ derived ----------------------------- */
  const helpers = useMemo(
    () => ({
      studentsByDepartment: students.reduce((acc, s) => {
        acc[s.department] = (acc[s.department] ?? 0) + 1;
        return acc;
      }, {}),
      totalCapacity: halls.reduce((sum, h) => sum + (h.capacity ?? 0), 0),
      plansForExam: (examId) => plans.filter((p) => p.examId === examId),
      planFor: (examId, hallId) => plans.find((p) => p.examId === examId && p.hallId === hallId),
      /** Halls this faculty member actually invigilates. */
      myHallIds: duties.reduce((set, d) => {
        if (d.hallId) set.add(d.hallId);
        return set;
      }, new Set()),
    }),
    [students, halls, plans, duties]
  );

  const value = useMemo(
    () => ({
      students,
      halls,
      exams,
      faculty,
      plans,
      duties,
      loading,
      loaded,
      error,
      role,
      refreshAll,
      retry: refreshAll,
      addStudent,
      editStudent,
      deleteStudent,
      bulkImport,
      bulkImportRows,
      addHall,
      editHall,
      deleteHall,
      addExam,
      editExam,
      deleteExam,
      applyGeneration,
      replacePlan,
      publishPlan,
      swapSeats,
      resetExam,
      loadDuties,
      addDuty,
      removeDuty,
      dashboardService,
      helpers,
    }),
    [
      students,
      halls,
      exams,
      faculty,
      plans,
      duties,
      loading,
      loaded,
      error,
      role,
      refreshAll,
      addStudent,
      editStudent,
      deleteStudent,
      bulkImport,
      bulkImportRows,
      addHall,
      editHall,
      deleteHall,
      addExam,
      editExam,
      deleteExam,
      applyGeneration,
      replacePlan,
      publishPlan,
      swapSeats,
      resetExam,
      loadDuties,
      addDuty,
      removeDuty,
      helpers,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/**
 * Projects a `GenerateSeatingResponse.halls[]` entry onto the lightweight plan
 * shape the list views hold. The full grid is fetched on demand by
 * `seatingService.getHallPlan`, so it is not duplicated into the store.
 */
function toPlanSummary(hall, generation) {
  return {
    id: `${generation.examId}-${hall.hallId}`,
    examId: generation.examId,
    examCode: generation.examCode,
    examTitle: generation.examTitle,
    hallId: hall.hallId,
    hallCode: hall.hallCode,
    hallName: hall.hallName,
    rows: hall.rows,
    cols: hall.cols,
    stats: {
      capacity: hall.capacity,
      blocked: hall.blocked,
      usable: hall.usable,
      allocated: hall.allocated,
      utilisation: hall.utilisation,
      departments: hall.departments,
    },
    verification: hall.verification,
    status: 'ALLOCATED',
  };
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

export default DataContext;
export { DataContext };
