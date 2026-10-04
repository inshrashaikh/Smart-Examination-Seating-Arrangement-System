import { api, callMock } from './api';
import * as mock from './mockApi';
import { USE_MOCKS } from './config';

/**
 * Notifications.
 *
 * The backend *creates* notifications as a side effect of the engine
 * (unallocated students, published plans, duty changes), so reading this list is
 * how the bell stays current — there is nothing to poll from the client side
 * beyond this endpoint.
 *
 * `GET /api/notifications` returns a bare array. `?email=` is clamped
 * server-side: a faculty member may only name themselves.
 *
 * `NotificationResponse` carries both `createdAt` and `at` — the UI reads `at`
 * with a fallback so it works against either.
 */
export const notificationService = {
  getAll: async (params = {}) => {
    const mocked = callMock(() => mock.dashboardApi.notifications());
    if (mocked) {
      const rows = await mocked;
      return applyReadFilter(rows, params);
    }

    // There is no `unreadOnly` query parameter — the filter is client-side.
    const rows = await api.get('/notifications', {
      params: params.email ? { email: params.email } : undefined,
    });
    const list = Array.isArray(rows) ? rows : [];
    return params.unreadOnly ? list.filter((n) => !n.read) : list;
  },

  /**
   * `GET /api/notifications/unread-count`.
   *
   * Note the shape: the endpoint wraps the number in an object
   * (`{ "count": 3 }`), it does not return a bare integer. Reading it as a
   * scalar yields `NaN` and a badge stuck at zero, so both forms are accepted —
   * the object because that is what the server sends, the scalar in case the
   * wrapper is ever dropped.
   */
  getUnreadCount: async (email) => {
    if (USE_MOCKS) {
      const rows = await notificationService.getAll({ unreadOnly: true });
      return rows.length;
    }
    // The backend has a dedicated counter, so do not download the whole list.
    const res = await api.get('/notifications/unread-count', {
      params: email ? { email } : undefined,
    });
    const raw = typeof res === 'object' && res !== null ? res.count : res;
    return Number(raw) || 0;
  },

  markRead: async (id) => {
    const mocked = callMock(() => mock.dashboardApi.markNotificationRead(id));
    if (mocked) return mocked;
    // PUT, not PATCH — see the OpenAPI spec.
    return api.put(`/notifications/${id}/read`);
  },

  markAllRead: async () => {
    const mocked = callMock(() => mock.dashboardApi.markAllNotificationsRead());
    if (mocked) return mocked;
    return api.put('/notifications/read-all');
  },
};

/** Mock mode filters client-side because the mock store ignores `unreadOnly`. */
function applyReadFilter(rows, params) {
  const list = Array.isArray(rows) ? rows : [];
  return params.unreadOnly ? list.filter((n) => !n.read) : list;
}

export default notificationService;