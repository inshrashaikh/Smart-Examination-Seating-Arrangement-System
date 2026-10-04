/**
 * Placeholder REST endpoints for the Java Spring Boot backend.
 * Base URL is `/api` (proxied to http://localhost:8080 by Vite — see vite.config.js).
 * Every path here maps 1:1 to a controller method on the server.
 */

export const ENDPOINTS = {
  // ---- Auth ----
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REGISTER: '/auth/register',
  ME: '/auth/me',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',

  // ---- Students ----
  STUDENTS: '/students',
  STUDENT_BY_ID: (id) => `/students/${id}`,
  STUDENTS_UPLOAD: '/students/upload',
  STUDENTS_TEMPLATE: '/students/template',
  STUDENTS_SEARCH: (q) => `/students/search?q=${encodeURIComponent(q)}`,

  // ---- Halls ----
  HALLS: '/halls',
  HALL_BY_ID: (id) => `/halls/${id}`,
  HALL_AVAILABILITY: (examId) => `/halls/availability?examId=${examId}`,

  // ---- Exams ----
  EXAMS: '/exams',
  EXAM_BY_ID: (id) => `/exams/${id}`,
  EXAMS_UPCOMING: '/exams/upcoming',

  // ---- Seating ----
  SEATING_GENERATE: '/seating/generate',
  SEATING_PLANS: '/seating/plans',
  SEATING_PLAN_BY_EXAM: (examId) => `/seating/plans?examId=${examId}`,
  SEATING_PLAN_BY_ID: (id) => `/seating/plans/${id}`,
  SEATING_SWAP: (id) => `/seating/plans/${id}/swap`,
  SEATING_PUBLISH: (id) => `/seating/plans/${id}/publish`,
  SEATING_EXPORT: (id, format = 'PDF') => `/seating/plans/${id}/export?format=${format}`,

  // ---- Attendance ----
  ATTENDANCE: (examId, hallId) => `/attendance?examId=${examId}&hallId=${hallId}`,
  ATTENDANCE_MARK: (id) => `/attendance/${id}`,
  ATTENDANCE_EXPORT: (examId, hallId) => `/attendance/export?examId=${examId}&hallId=${hallId}`,

  // ---- Reports ----
  REPORTS_HALL_WISE: '/reports/hall-wise',
  REPORTS_DEPARTMENT_WISE: '/reports/department-wise',
  REPORTS_STUDENT_WISE: '/reports/student-wise',
  REPORTS_ATTENDANCE: '/reports/attendance',
  REPORTS_EXPORT: (type, format = 'PDF') => `/reports/${type}/export?format=${format}`,

  // ---- Faculty ----
  FACULTY: '/faculty',
  FACULTY_BY_ID: (id) => `/faculty/${id}`,
  DUTIES: '/duties',
  DUTY_BY_ID: (id) => `/duties/${id}`,
  DUTY_ASSIGN: '/duties/assign',
  MY_DUTIES: (email) => `/duties/faculty?email=${encodeURIComponent(email ?? '')}`,

  // ---- Dashboard ----
  DASHBOARD_ADMIN: '/dashboard/admin',
  DASHBOARD_FACULTY: '/dashboard/faculty',
  ACTIVITY: '/activity',

  // ---- Profile & settings ----
  PROFILE: '/profile',
  PROFILE_PASSWORD: '/profile/password',
  SETTINGS: '/settings',

  // ---- Notifications ----
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_READ: (id) => `/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: '/notifications/read-all',
};

export default ENDPOINTS;