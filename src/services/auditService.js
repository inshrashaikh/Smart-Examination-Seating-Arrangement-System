import { api } from './api';

/**
 * Audit trail — every noteworthy action the system has taken.
 *
 * Admin-only server-side (`/api/audit/**` sits under the ADMIN rule), so
 * there is no read for faculty and no write path at all: entries are written
 * by the backend at the moment something happens.
 */
export const auditService = {
  /**
   * Paged trail, newest first.
   *
   * @param {object} `{ page, size }` — page is 0-based on the wire.
   */
  page: async ({ page = 0, size = 25 } = {}) => {
    const rows = await api.get('/audit', { params: { page, size } });
    return rows ?? { items: [], total: 0, page: 1, pageSize: size, totalPages: 1 };
  },

  /** The 200 most recent entries — handy for a quick "what happened" glance. */
  recent: async () => {
    const rows = await api.get('/audit/recent');
    return Array.isArray(rows) ? rows : [];
  },
};

export default auditService;
