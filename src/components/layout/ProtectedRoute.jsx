import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RouteLoader from '../ui/RouteLoader';

/** Where each role is allowed to land. Kept in one place. */
export const ROLE_HOME = {
  ADMIN: '/admin',
  FACULTY: '/faculty',
};

/**
 * Gate for authenticated routes, optionally restricted by role.
 *
 *  - unauthenticated  -> /login, remembering where they were headed
 *  - wrong role       -> that role's own dashboard (never a dead end, never a
 *                        half-rendered admin page)
 *  - still validating -> full-screen loader rather than a login flash
 */
export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, role: userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) return <RouteLoader label="Checking your session…" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (role && userRole !== role) {
    return <Navigate to={ROLE_HOME[userRole] ?? '/admin'} replace />;
  }

  return children;
}

export { ProtectedRoute };
