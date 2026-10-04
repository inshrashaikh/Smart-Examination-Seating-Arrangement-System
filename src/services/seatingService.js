import { api, callMock } from './api';
import * as mock from './mockApi';
import { USE_MOCKS } from './config';

/**
 * Seating engine.
 *
 * Plan ids are **hall-scoped**: `EXAM-HALL`, e.g. `EX-001-H-1`. Because both
 * halves contain a hyphen the backend resolves the id against the database
 * rather than splitting on `-`, and it also accepts a bare exam id (which
 * falls back to that exam's first hall). So the frontend can pass either.
 *
 * `HallPlanResponse` is already the exact shape `HallPlanGrid` renders:
 * `{ id, examId, hallId, rows, cols, seats: Seat[][], stats, verification, status, history }`
 * with each seat carrying `{ row, col, label, blocked, studentId, rollNo, name,
 * department, year, section, allocationId }`.
 */
export const seatingService = {
  /**
   * Runs the allocator and persists the plan.
   *
   * @param {string} examId
   * @param {string[]} hallIds
   * @param {object}  rules   see DEFAULT_RULES below
   * @param {object}  options `{ departments, skipErrorToast }`
   * @returns {Promise<GenerateSeatingResponse>}
   */
  generate: (examId, hallIds, rules = {}, options = {}) => {
    const payload = {
      examId,
      hallIds: hallIds ?? [],
      departments: options.departments ?? null,
      rules: { ...DEFAULT_RULES, ...rules },
    };

    const mocked = callMock(() => mock.seatingApi.generate(payload));
    if (mocked) return mocked;

    return api.post('/seating/generate', payload, {
      // The engine can take a while and the page renders its own error card.
      skipErrorToast: options.skipErrorToast ?? true,
      timeout: 120_000,
    });
  },

  /** Every hall plan, optionally filtered by exam. Faculty get only their halls. */
  list: async (params = {}) => {
    const mocked = callMock(() => mock.seatingApi.list(params));
    if (mocked) return mocked;
    const rows = await api.get('/seating/plans', { params });
    return Array.isArray(rows) ? rows : [];
  },

  /** One hall plan by id (`EX-001-H-1`), or a bare exam id. */
  getHallPlan: (planId, options = {}) => {
    const mocked = callMock(() => mock.seatingApi.get(planId));
    if (mocked) return mocked;
    return api.get(`/seating/plans/${encodeURIComponent(planId)}`, {
      skipErrorToast: options.skipErrorToast ?? false,
    });
  },

  /**
   * Swaps two seats inside one plan.
   *
   * Sends `row` + `col` on **both** references even though the grid also
   * carries `allocationId`.
   *
   * Why both: `SeatingServiceImpl.findAt` bails out with
   * `if (ref.getRow() == null || ref.getCol() == null) return null;` *before* it
   * reaches its `allocationId` branch, so an allocation-id-only reference
   * silently resolves to nothing and the endpoint answers 404
   * ("Seated allocation not found: row null col null in <hall>"). Sending the
   * coordinates works against the current backend and still works unchanged
   * once that guard is reordered — so this call site is future-proof either way.
   *
   * The backend re-validates adjacency unless `validate` is explicitly false;
   * an illegal swap comes back as 409, and the grid must not update
   * optimistically — hence this returns the *server's* refreshed plan.
   */
  swap: (planId, seatA, seatB, options = {}) => {
    const ref = (seat) => ({
      // allocationId is advisory today; row/col is what actually resolves.
      ...(seat?.allocationId ? { allocationId: seat.allocationId } : {}),
      row: seat?.row,
      col: seat?.col,
      hallId: seat?.hallId ?? options.hallId,
    });

    const body = {
      examId: options.examId,
      a: ref(seatA),
      b: ref(seatB),
      // Omitted means "validate" server-side, so only send an explicit false.
      ...(options.validate === false ? { validate: false } : {}),
    };

    const mocked = callMock(() => mock.seatingApi.swap(planId, seatA, seatB));
    if (mocked) return mocked;

    return api.post(`/seating/plans/${encodeURIComponent(planId)}/swap`, body, {
      skipErrorToast: options.skipErrorToast ?? false,
    });
  },

  /** Publishes a plan. Returns the refreshed `HallPlanResponse`. */
  publish: (planId) => {
    const mocked = callMock(() => mock.seatingApi.publish(planId));
    if (mocked) return mocked;
    return api.post(`/seating/plans/${encodeURIComponent(planId)}/publish`);
  },

  /**
   * Plan-quality aggregates for the analytics page: one row per exam with a
   * plan, plus the per-engine roll-up that powers the engine comparison.
   */
  quality: async () => {
    const rows = await api.get('/seating/quality');
    return rows ?? { exams: [], engines: [] };
  },

  /** Clears an exam's plans and allocations; the exam returns to SCHEDULED. */
  reset: (examId) => api.delete(`/seating/exam/${encodeURIComponent(examId)}`),
};

/**
 * Server-side defaults, mirrored from the backend's `SeatingRules`.
 * Anything omitted here is filled in by `SeatingAlgorithm`.
 */
export const DEFAULT_RULES = {
  mixDepartments: true,
  avoidSameDeptAdjacent: true,
  avoidSameDeptDiagonal: true,
  avoidSameYearAdjacent: true,
  keepLastRowClear: true,
  shuffle: true,
  strictCapacity: true,
  seed: 0,
};

export { USE_MOCKS };
export default seatingService;
