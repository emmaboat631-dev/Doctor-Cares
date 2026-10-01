import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/** Redirects signed-in users away from public-only pages (login, register…). */
export function PublicRoute() {
  const { loading, session, passwordRecovery } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullScreen label="Loading…" />;
  // A recovery session shouldn't unlock the app — keep the user on /reset-password.
  if (session && passwordRecovery && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }
  if (session && !passwordRecovery) return <Navigate to="/" replace />;
  return <Outlet />;
}
