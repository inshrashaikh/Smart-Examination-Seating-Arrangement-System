import { api, callMock } from './api';
import * as mock from './mockApi';
import { triggerDownload } from './studentService';

/**
 * Faculty directory and invigilation duties.
 *
 * Access model (enforced server-side, mirrored here so the UI can grey out):
 *  - admin    : `/api/faculty`, `/api/duties`, `?email=` may name anyone
 *  - faculty  : may only name themselves via `?email=`; anything else is 403
 *
 * `GET /api/duties/my*` routes exist so a faculty member never has to send an
 * email at all — the backend derives the identity from the JWT.
 */
export const facultyService = {
  /** The directory — `GET /api/faculty` returns a bare array. */
  getAll: async () => {
    const mocked = callMock(() => mock.facultyApi.list());
    if (mocked) return mocked;
    const rows = await api.get('/faculty');
    return Array.isArray(rows) ? rows : [];
  },

  getById: (id) => api.get(`/faculty/${id}`),

  /**
   * Assigns a duty.
   *
   * `role` is one of INVIGILATOR / CHIEF_INVIGILATOR / EXTERNAL_SUPERVISOR;
   * `facultyId`, `examId` and `hallId` are required server-side. `date`,
   * `startTime` and `endTime` are optional — omitted, the backend inherits the
   * exam's own schedule.
   */
  assignDuty: (payload) =>
    callMock(() => mock.facultyApi.assignDuty(payload)) ?? api.post('/duties/assign', payload),

  removeDuty: (id) => callMock(() => mock.facultyApi.remove(id)) ?? api.delete(`/duties/${id}`),

  /**
   * Updates a duty's status. The endpoint accepts the status either as a query
   * parameter or in a JSON body — we send both so it works regardless of how
   * the controller is mapped.
   *
   * `DutyStatus` values are ASSIGNED / CONFIRMED / COMPLETED / CANCELLED.
   */
  updateDutyStatus: (id, status) =>
    api.patch(`/duties/${id}/status`, { status }, { params: { status } }),

  /* --------------------------- faculty reads --------------------------- */

  /**
   * Admin duty roster — `GET /api/duties` with no `examId`/`facultyId` returns
   * every duty on record. Both optional filters narrow it further:
   *   ?examId=EX-003            duties for one exam
   *   ?facultyId=U-0002         duties for one person
   *
   * ADMIN-only in the security rules (`/api/duties/**`), so this is the
   * counterpart of `getMyDuties()` rather than a fallback for it.
   */
  getAllDuties: async (params = {}) => {
    const rows = await api.get('/duties', {
      params: {
        ...(params.examId ? { examId: params.examId } : {}),
        ...(params.facultyId ? { facultyId: params.facultyId } : {}),
      },
    });
    return Array.isArray(rows) ? rows : [];
  },

  /** Duties for the signed-in faculty member. */
  getMyDuties: async () => {
    const rows = await api.get('/duties/my');
    return Array.isArray(rows) ? rows : [];
  },

  /** Admin form of the same read — `?email=` is clamped server-side. */
  getDutiesByEmail: async (email) => {
    const rows = await api.get('/duties/faculty', { params: { email } });
    return Array.isArray(rows) ? rows : [];
  },

  myUpcoming: async () => {
    const rows = await api.get('/duties/my/upcoming');
    return Array.isArray(rows) ? rows : [];
  },

  /**
   * Read-only hall plan for a duty.
   *
   * The endpoint answers a **list** (`ApiResponse<List<HallPlanResponse>>`) even
   * though the path already pins one hall and the controller filters on it —
   * in practice at most one element comes back. It is unwrapped here so callers
   * deal with a single plan or `null`.
   *
   * `examId` is optional server-side; omitted, the backend falls back to the
   * exam of the caller's first duty. 403 when this person is not invigilating
   * the hall — that is deliberate, not a bug to hide.
   */
  getMyHallPlan: async (hallId, examId) => {
    const rows = await api.get(`/duties/my/hall/${encodeURIComponent(hallId)}/plan`, {
      params: examId ? { examId } : undefined,
    });
    if (Array.isArray(rows)) return rows[0] ?? null;
    return rows ?? null;
  },

  /**
   * Attendance sheet for a duty.
   *
   * `examId` is **required** here (unlike the plan route), and the response is
   * the same `AttendanceSheet` the admin reports page reads: `{ exam, halls[],
   * rows[], summary }`.
   */
  getMyAttendance: (hallId, examId) =>
    api.get(`/duties/my/hall/${encodeURIComponent(hallId)}/attendance`, {
      params: { examId },
    }),

  /**
   * Saves present/absent marks for a hall this faculty member supervises.
   *
   * `POST /api/duties/my/hall/{hallId}/attendance?examId=` — the backend scopes
   * the write to halls the caller actually invigilates (403 otherwise) and is
   * idempotent per `allocationId`, so re-posting a batch after a timeout
   * overwrites rather than duplicates. The body carries `examId` (required by
   * `MarkAttendanceRequest` even though the query string also has it) plus
   * `records: [{ allocationId, present, note? }]`. Returns the refreshed
   * `AttendanceSheet` — the server's own copy, not an echo of the request.
   */
  markAttendance: (hallId, examId, records) =>
    api.post(`/duties/my/hall/${encodeURIComponent(hallId)}/attendance`, {
      examId,
      records,
    }, { params: { examId } }),
};

/* ------------------------------- reports ------------------------------- */

/**
 * Streams an attendance sheet as PDF, Excel or CSV.
 *
 * Routed through the duty-scoped `GET /api/duties/my/hall/{hallId}/attendance`,
 * which honours `?format=pdf|excel|csv` (via the shared `TableDownloader`) *
 * and* is scoped to the invigilator's own hall — a faculty member asking for a
 * hall they do not invigilate gets a 403 rather than a file. This used to go
 * through `/api/reports/attendance`, which is readable by any faculty member
 * for any hall and only happened to be narrowed by the caller passing their
 * own hallId.
 */
export async function downloadAttendanceSheet(hallId, examId, format = 'excel') {
  const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx';
  const name = `attendance-${examId}-${hallId}.${ext}`;
  const blob = await api.get(`/duties/my/hall/${encodeURIComponent(hallId)}/attendance`, {
    params: { examId, format },
    responseType: 'blob',
  });
  triggerDownload(blob, name);
  return { blob, filename: name };
}

export default facultyService;
