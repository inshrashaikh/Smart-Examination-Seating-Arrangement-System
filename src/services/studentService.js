import { api, callMock } from './api';
import * as mock from './mockApi';

/**
 * Students.
 *
 * The list endpoint is server-paged and returns
 * `{ items, total, page, pageSize, totalPages, first, last }` with a **0-based**
 * `page`. The mock store is 1-based, so `getAll` normalises to 0-based and the
 * page components never have to know which backend answered.
 */

/** Page components -> the query parameters the backend understands. */
const normaliseListParams = ({
  page = 0,
  size = 10,
  search = '',
  department = '',
  year = '',
  sortBy = '',
  sortDir = '',
} = {}) => {
  const params = {
    page: Math.max(0, Number(page) || 0),
    pageSize: Math.max(1, Number(size) || 10),
  };
  if (search) params.search = search;
  if (department && department !== 'ALL') params.department = department;
  if (year && year !== 'ALL') params.year = year;
  if (sortBy) params.sortBy = sortBy;
  if (sortDir) params.sortDir = sortDir;
  return params;
};

export const studentService = {
  /**
   * @returns {Promise<{items:Array,total:number,page:number,pageSize:number,
   *                    totalPages:number,first:boolean,last:boolean}>}
   */
  getAll: async (args = {}) => {
    const params = normaliseListParams(args);
    const mocked = callMock(() =>
      // mockApi is 1-based and only understands sortBy/sortDir.
      mock.studentsApi.list({ ...params, page: params.page + 1, pageSize: params.pageSize })
    );
    if (mocked) return mocked;

    const page = await api.get('/students', {
      params,
      skipErrorToast: args.skipErrorToast ?? false,
    });

    // Defensive: if a proxy ever strips the envelope we still return a page.
    if (Array.isArray(page)) {
      return {
        items: page,
        total: page.length,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: 1,
        first: true,
        last: true,
      };
    }
    return {
      items: page?.items ?? [],
      total: page?.total ?? 0,
      page: page?.page ?? params.page,
      pageSize: page?.pageSize ?? params.pageSize,
      totalPages: page?.totalPages ?? 0,
      first: page?.first ?? true,
      last: page?.last ?? true,
    };
  },

  getById: (id) => callMock(() => mock.studentsApi.get(id)) ?? api.get(`/students/${id}`),

  /** Exact roll-number lookup — the backend keeps a unique index on `roll_no`. */
  getByRollNo: (rollNo) => api.get(`/students/roll/${encodeURIComponent(rollNo)}`),

  /** Free-text search across roll no, name, email and PRN. Returns an array. */
  search: (q) => api.get('/students/search', { params: { q } }),

  create: (payload) => callMock(() => mock.studentsApi.create(payload)) ?? api.post('/students', payload),

  update: (id, payload) =>
    callMock(() => mock.studentsApi.update(id, payload)) ?? api.put(`/students/${id}`, payload),

  remove: (id) => callMock(() => mock.studentsApi.remove(id)) ?? api.delete(`/students/${id}`),

  /**
   * Multipart upload of a CSV or XLSX register.
   *
   * `onProgress` receives axios's progress event, so the modal can show a real
   * percentage instead of a fake timer. The backend parses with OpenCSV and
   * Apache POI and answers with
   * `{ total, added, duplicates, invalid, fileName, errors:[{row,rollNo,field,message}] }`
   * — rows that fail validation are reported, never silently dropped.
   *
   * Mock mode has no file reader in the service layer, so `BulkUploadModal`
   * checks `USE_MOCKS` and calls `uploadRows(rows)` instead.
   */
  uploadFile: (file, onProgress, options = {}) => {
    if (!file) return Promise.reject({ message: 'No file selected.', status: 0 });

    const form = new FormData();
    form.append('file', file);

    return api
      .post('/students/upload', form, {
        // axios must generate the multipart boundary itself.
        headers: { 'Content-Type': undefined },
        onUploadProgress: (event) => {
          if (!onProgress) return;
          // `total` is absent when the browser streams a File from disk.
          const total = event.total || file.size || 0;
          onProgress({
            loaded: event.loaded,
            total,
            percent: total ? Math.min(99, Math.round((event.loaded / total) * 100)) : 50,
          });
        },
        skipErrorToast: options.skipErrorToast ?? true,
      })
      .then((result) => {
        onProgress?.({ loaded: 1, total: 1, percent: 100, done: true });
        return result;
      });
  },

  /** Mock-mode upload: ingests already-parsed row objects. */
  uploadRows: (rows) => mock.studentsApi.upload(rows),

  /** Streams a CSV template straight from the backend. */
  downloadTemplate: () =>
    api
      .get('/students/template', { responseType: 'blob' })
      .then((response) => {
        triggerDownload(response.data, 'student-register-template.csv');
        return response.data;
      }),
};

/** Creates an object URL and clicks a detached anchor — the download primitive. */
export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default studentService;
