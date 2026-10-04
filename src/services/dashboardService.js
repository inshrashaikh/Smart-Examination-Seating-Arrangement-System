import { api, callMock } from './api';
import * as mock from './mockApi';

/**
 * Dashboard aggregates.
 *
 * `GET /api/dashboard/stats` and `GET /api/dashboard/admin` return the *same*
 * `AdminDashboardResponse`; `stats` is the canonical name used by the UI.
 *
 * Shape:
 * {
 *   stats: { totalStudents, totalHalls, examsScheduled, seatsAllocated,
 *            totalCapacity, facultyCount, activePlans, clashes,
 *            avgUtilisation, unallocatedNotifications },
 *   allocationsOverTime: [{ month, seats, students }],
 *   departmentDistribution: [{ name, value, color }],
 *   hallUtilisation: [{ hall, utilisation }],
 *   upcoming: [ExamResponse],
 *   activity: [{ id, type, title, detail, at, actor }],
 *   examsByStatus: [{ name, value, color }]
 * }
 */
export const dashboardService = {
  /** Admin dashboard — stat cards, line chart, pie chart, activity feed. */
  getStats: async () => {
    const mocked = callMock(() => mock.dashboardApi.admin());
    if (mocked) return mocked;
    return api.get('/dashboard/stats');
  },

  /** Alias kept for call sites that read better as `admin()`. */
  admin: () => dashboardService.getStats(),

  /**
   * Faculty dashboard — duty counts, next duty, notifications.
   * The backend synthesises a `faculty` block from the `users` table when the
   * person is not in the directory, so this always resolves.
   */
  getFacultyStats: (email) =>
    callMock(() => mock.dashboardApi.faculty(email)) ??
    api.get('/dashboard/faculty', { params: email ? { email } : undefined }),

  /** Recent activity feed; `limit` defaults to 20 server-side. */
  activity: (limit) =>
    callMock(() => mock.dashboardApi.activity()) ??
    api.get('/activity', { params: limit ? { limit } : undefined }),

  /* ------------------------------ settings ----------------------------- */
  getSettings: () => api.get('/settings'),

  updateSettings: (payload) =>
    callMock(() => mock.dashboardApi.updateSettings(payload)) ?? api.put('/settings', payload),
};

export default dashboardService;
