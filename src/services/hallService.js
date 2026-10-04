import { api, callMock } from './api';
import * as mock from './mockApi';

/**
 * Examination halls.
 *
 * `GET /api/halls` returns a bare array (not a page). `HallResponse` carries
 * the grid twice — `rows`/`cols` and `rowsCount`/`colsCount` — so form modals
 * can post `rows`/`cols` verbatim without remapping.
 */
export const hallService = {
  getAll: async () => {
    const mocked = callMock(() => mock.hallsApi.list());
    if (mocked) return mocked;
    const rows = await api.get('/halls');
    return Array.isArray(rows) ? rows : [];
  },

  getById: (id) => callMock(() => mock.hallsApi.get(id)) ?? api.get(`/halls/${id}`),

  create: (payload) => callMock(() => mock.hallsApi.create(payload)) ?? api.post('/halls', payload),

  update: (id, payload) =>
    callMock(() => mock.hallsApi.update(id, payload)) ?? api.put(`/halls/${id}`, payload),

  remove: (id) => callMock(() => mock.hallsApi.remove(id)) ?? api.delete(`/halls/${id}`),

  /** Halls still free for an exam, with remaining capacity. */
  availability: (examId) => api.get('/halls/availability', { params: { examId } }),
};

export default hallService;
