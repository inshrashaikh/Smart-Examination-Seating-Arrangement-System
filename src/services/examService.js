import { api, callMock } from './api';
import * as mock from './mockApi';

/**
 * Exams.
 *
 * `GET /api/exams` returns a bare array. `ExamResponse` already includes
 * `status`, `eligibleStudents`, `allocatedSeats`, `hallIds` and `hallCodes`,
 * so the list page needs no extra joins.
 */
export const examService = {
  getAll: async () => {
    const mocked = callMock(() => mock.examsApi.list());
    if (mocked) return mocked;
    const rows = await api.get('/exams');
    return Array.isArray(rows) ? rows : [];
  },

  getById: (id) => callMock(() => mock.examsApi.get(id)) ?? api.get(`/exams/${id}`),

  create: (payload) => callMock(() => mock.examsApi.create(payload)) ?? api.post('/exams', payload),

  update: (id, payload) =>
    callMock(() => mock.examsApi.update(id, payload)) ?? api.put(`/exams/${id}`, payload),

  /**
   * The backend refuses with 409 when the exam still owns seat allocations:
   * "… has N seat allocations. Reset the exam before deleting it."
   * `DELETE /api/seating/exam/{id}` clears them first — the confirm dialog in
   * Exams.jsx offers exactly that.
   */
  remove: (id) => callMock(() => mock.examsApi.remove(id)) ?? api.delete(`/exams/${id}`),

  /** Flips an exam to PUBLISHED. Alias of `POST /exams/{id}/publish`. */
  publish: (id) => api.post(`/exams/${id}/publish`),

  upcoming: () => api.get('/exams/upcoming'),
};

export default examService;
