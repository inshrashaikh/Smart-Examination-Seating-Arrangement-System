import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Keeps signed-in users away from the login screen. */
export default function PublicRoute({ children }) {
  const { isAuthenticated, homePath } = useAuth();

  if (isAuthenticated) return <Navigate to={homePath} replace />;
  return children;
}

export { PublicRoute };
