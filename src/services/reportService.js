import { api, callMock } from './api';
import * as mock from './mockApi';
import { triggerDownload } from './studentService';
import { USE_MOCKS } from './config';

/**
 * Reports.
 *
 * Four report families, each available as JSON, PDF or Excel:
 *   hall-wise · department-wise · student-wise · attendance
 *
 * The JSON variants drive the on-screen preview table. The `?format=pdf|excel`
 * variants stream bytes with `Content-Disposition: attachment`, so they are
 * requested with `responseType: 'blob'` and handed straight to the browser —
 * the frontend never re-renders a report itself.
 */

const PATHS = {
  hall: '/reports/hall-wise',
  department: '/reports/department-wise',
  student: '/reports/student-wise',
  attendance: '/reports/attendance',
};

/** Falls back to a sensible filename when the server sets no Content-Disposition. */
function filenameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition);
  if (star) return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1].trim() : fallback;
}

const extOf = (format) => (format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'json');

/**
 * Streams one report to disk.
 *
 * @param {string} type        'hall' | 'department' | 'student' | 'attendance'
 * @param {string} examId
 * @param {string} hallId      optional — attendance and hall-wise can narrow
 * @param {string} format      'pdf' | 'excel' | 'csv' | 'json'
 * @param {object} extra       any additional query parameters (e.g. `{ search }`)
 * @returns {Promise<{filename:string, size:number, blob:Blob}>}
 */
export const reportService = {
  download: async (type, examId, hallId, format = 'excel', extra = {}) => {
    const base = PATHS[type];
    if (!base) throw { message: `Unknown report type "${type}".`, status: 0 };

    const params = { ...extra };
    if (examId) params.examId = examId;
    if (hallId) params.hallId = hallId;
    if (format) params.format = format;

    const fallback = `${type}-wise${examId ? `-${examId}` : ''}.${extOf(format)}`;

    const response = await api.get(base, {
      params,
      responseType: 'blob',
      // Errors arrive as a Blob too, so decode before reading the message.
      skipErrorToast: true,
      timeout: 60_000,
    });

    // axios only surfaces `validateStatus` rejections as errors, but a JSON
    // error body can still ride along on a 200 when a proxy rewrites things.
    const contentType = response.headers?.['content-type'] ?? '';
    if (contentType.includes('application/json')) {
      const text = await response.data.text();
      let payload = null;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
      throw {
        message: payload?.message ?? 'The report could not be generated.',
        status: Number(payload?.status) || 500,
        errors: payload?.errors ?? null,
      };
    }

    const filename = filenameFromDisposition(
      response.headers?.['content-disposition'],
      fallback
    );
    triggerDownload(response.data, filename);
    return { filename, size: response.data.size ?? 0, blob: response.data };
  },

  /** JSON preview of a report — same shapes the backend serves inline. */
  get: async (type, params = {}) => {
    const base = PATHS[type];
    if (!base) throw { message: `Unknown report type "${type}".`, status: 0 };

    const mocked = mockFor(type, params);
    if (mocked) return mocked;

    const query = {};
    if (params.examId) query.examId = params.examId;
    if (params.hallId) query.hallId = params.hallId;
    if (params.search) query.search = params.search;
    return api.get(base, { params: query });
  },

  hallWise: (params) => reportService.get('hall', params),
  departmentWise: (params) => reportService.get('department', params),
  studentWise: (params) => reportService.get('student', params),
  attendance: (params) => reportService.get('attendance', params),
};

/** Bridges the four report families onto the mock store when demo mode is on. */
function mockFor(type, params) {
  if (!USE_MOCKS) return null;
  switch (type) {
    case 'hall':
      return Promise.resolve(mock.reportsApi.hallWise(params));
    case 'department':
      return Promise.resolve(mock.reportsApi.departmentWise(params));
    case 'student':
      return Promise.resolve(mock.reportsApi.studentWise(params));
    case 'attendance':
      return Promise.resolve(mock.reportsApi.attendance(params));
    default:
      return null;
  }
}

/**
 * Client-side CSV / Excel / JSON writer.
 *
 * Retained for the *preview table* only ("download what you are looking at").
 * Authoritative exports always go through `download()` above so the bytes come
 * from the server.
 */
export const exportService = {
  toCsv(rows, filename) {
    if (!rows?.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(',')),
    ].join('\n');
    // BOM keeps Excel happy with UTF-8 content.
    triggerDownload(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' }), withExt(filename, 'csv'));
  },

  toExcel(rows, filename) {
    if (!rows?.length) return;
    const headers = Object.keys(rows[0]);
    const table = `<table border="1"><thead><tr>${headers
      .map((h) => `<th>${escapeCsv(h)}</th>`)
      .join('')}</tr></thead><tbody>${rows
      .map(
        (row) =>
          `<tr>${headers.map((h) => `<td>${escapeCsv(row[h])}</td>`).join('')}</tr>`
      )
      .join('')}</tbody></table>`;
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head><body>${table}</body></html>`;
    triggerDownload(
      new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }),
      withExt(filename, 'xls')
    );
  },

  toJson(data, filename) {
    triggerDownload(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      withExt(filename, 'json')
    );
  },

  /** Opens the browser print dialog scoped to `.print-area`. */
  toPdf(title = 'Document') {
    const previous = document.title;
    document.title = title;
    window.print();
    setTimeout(() => {
      document.title = previous;
    }, 800);
  },
};

function escapeCsv(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function withExt(filename, ext) {
  return String(filename).endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
}

export { triggerDownload };
export default reportService;
