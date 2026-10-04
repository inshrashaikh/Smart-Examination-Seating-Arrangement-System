import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { DataProvider } from './context/DataContext.jsx';

import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import PublicRoute from './components/layout/PublicRoute.jsx';
import RouteLoader from './components/ui/RouteLoader.jsx';
import NetworkBanner from './components/ui/NetworkBanner.jsx';
import ScrollToTop from './components/layout/ScrollToTop.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminStudents = lazy(() => import('./pages/admin/Students.jsx'));
const AdminHalls = lazy(() => import('./pages/admin/Halls.jsx'));
const AdminExams = lazy(() => import('./pages/admin/Exams.jsx'));
const AdminGenerate = lazy(() => import('./pages/admin/GenerateSeating.jsx'));
const AdminHallPlan = lazy(() => import('./pages/admin/HallPlanViewerPage.jsx'));
const AdminReports = lazy(() => import('./pages/admin/Reports.jsx'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics.jsx'));
const AdminAudit = lazy(() => import('./pages/admin/Audit.jsx'));
const AdminFaculty = lazy(() => import('./pages/admin/Faculty.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/Settings.jsx'));

const FacultyDashboard = lazy(() => import('./pages/faculty/Dashboard.jsx'));
const FacultyDuties = lazy(() => import('./pages/faculty/Duties.jsx'));
const FacultyHallPlan = lazy(() => import('./pages/faculty/HallPlan.jsx'));
const FacultyAttendance = lazy(() => import('./pages/faculty/Attendance.jsx'));
const FacultyNotifications = lazy(() => import('./pages/faculty/Notifications.jsx'));
const FacultyProfile = lazy(() => import('./pages/faculty/Profile.jsx'));

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <ScrollToTop />
            {/* Overlays every route: appears when the backend stops answering. */}
            <NetworkBanner />
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                {/* ---------------- Public ---------------- */}
                <Route path="/" element={<Landing />} />
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />

                {/* ---------------- Examination Department ---------------- */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/students"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <AdminStudents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/halls"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <AdminHalls />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/exams"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <AdminExams />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/generate"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <AdminGenerate />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/hall-plan"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <AdminHallPlan />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <AdminReports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <AdminAnalytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <AdminAudit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/faculty"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <AdminFaculty />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute role="ADMIN">
                      <AdminSettings />
                    </ProtectedRoute>
                  }
                />

                {/* ---------------- Faculty ---------------- */}
                <Route
                  path="/faculty"
                  element={
                    <ProtectedRoute role="FACULTY">
                      <FacultyDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/faculty/duties"
                  element={
                    <ProtectedRoute role="FACULTY">
                      <FacultyDuties />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/faculty/hall-plan"
                  element={
                    <ProtectedRoute role="FACULTY">
                      <FacultyHallPlan />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/faculty/attendance"
                  element={
                    <ProtectedRoute role="FACULTY">
                      <FacultyAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/faculty/notifications"
                  element={
                    <ProtectedRoute role="FACULTY">
                      <FacultyNotifications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/faculty/profile"
                  element={
                    <ProtectedRoute role="FACULTY">
                      <FacultyProfile />
                    </ProtectedRoute>
                  }
                />

                {/* ---------------- Fallbacks ---------------- */}
                <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export { App };
