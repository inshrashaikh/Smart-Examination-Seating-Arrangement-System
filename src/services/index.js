/**
 * Service barrel.
 *
 * One module per domain, each owning its REST paths. Pages import from here and
 * never build a URL themselves. The legacy aliases at the bottom
 * (`studentsService`, `hallsService`, …) exist so pre-existing call sites keep
 * resolving; new code should use the canonical names above.
 *
 * Toggle demo mode with `VITE_USE_MOCKS=true` (see src/services/config.js).
 */
import api, { clearStoredSession, onNetworkDown, onNetworkUp, isApiReachable } from './api';
import { API_BASE_URL, API_ORIGIN, USE_MOCKS, STORAGE_KEYS, SEARCH_DEBOUNCE_MS } from './config';

import authService from './authService';
import studentService from './studentService';
import hallService from './hallService';
import examService from './examService';
import seatingService from './seatingService';
import facultyService, { downloadAttendanceSheet } from './facultyService';
import reportService, { exportService, triggerDownload } from './reportService';
import dashboardService from './dashboardService';
import notificationService from './notificationService';
import auditService from './auditService';

export {
  api,
  authService,
  studentService,
  hallService,
  examService,
  seatingService,
  facultyService,
  reportService,
  dashboardService,
  notificationService,
  auditService,
  exportService,
  triggerDownload,
  downloadAttendanceSheet,
  // config + network plumbing
  API_BASE_URL,
  API_ORIGIN,
  USE_MOCKS,
  STORAGE_KEYS,
  SEARCH_DEBOUNCE_MS,
  clearStoredSession,
  onNetworkDown,
  onNetworkUp,
  isApiReachable,
};

/* ------------------------------------------------------------------ *
 * Legacy aliases — kept so untouched pages do not break.
 * ------------------------------------------------------------------ */
export const studentsService = studentService;
export const hallsService = hallService;
export const examsService = examService;
export const reportsService = {
  hallWise: reportService.hallWise,
  departmentWise: reportService.departmentWise,
  studentWise: reportService.studentWise,
  attendance: reportService.attendance,
  get: reportService.get,
  download: reportService.download,
};

/** Parses a pasted CSV/TSV block into row objects (template helper). */
export function parseDelimited(text) {
  if (!text) return [];
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length);
  if (!lines.length) return [];
  const delimiter =
    lines[0].includes('\t')
      ? '\t'
      : lines[0].split(',').length > lines[0].split('\t').length
        ? ','
        : '\t';
  const split = (line) => {
    const cells = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        cells.push(current.trim());
        current = '';
      } else current += char;
    }
    cells.push(current.trim());
    return cells;
  };
  const headers = split(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return headers.reduce((acc, header, index) => {
      acc[header] = cells[index] ?? '';
      return acc;
    }, {});
  });
}

export default {
  auth: authService,
  students: studentService,
  halls: hallService,
  exams: examService,
  seating: seatingService,
  faculty: facultyService,
  reports: reportService,
  dashboard: dashboardService,
  notifications: notificationService,
  audit: auditService,
  export: exportService,
};
