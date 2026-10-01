import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { hasSeenOnboarding } from '@/lib/onboarding';
import type { UserRole } from '@/types';

interface Props {
  allow?: UserRole[];
  children?: ReactNode;
}

export function ProtectedRoute({ allow, children }: Props) {
  const { loading, profileLoading, profileLoaded, session, role, passwordRecovery } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullScreen label="Verifying session…" />;

  if (!session) {
    // First-time visitors get the splash → onboarding → login flow.
    // Returning visitors go straight to /login.
    const nextPath = hasSeenOnboarding() ? '/login' : '/welcome';
    return <Navigate to={nextPath} state={{ from: location.pathname }} replace />;
  }

  // Force password reset before letting a recovery-session user use the app.
  if (passwordRecovery && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }

  if (allow) {
    // Session is real but we haven't finished loading the profile row yet.
    // Show a spinner instead of redirecting to /select-role — this prevents
    // the "preparing your account" flash right after login.
    if (profileLoading || !profileLoaded) {
      return <LoadingSpinner fullScreen label="Loading your account…" />;
    }
    if (!role) return <Navigate to="/select-role" replace />;
    if (!allow.includes(role)) return <Navigate to="/" replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
