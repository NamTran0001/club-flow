import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { ForbiddenPage, SessionErrorPage, SessionLoadingPage } from '../pages/SessionPages.jsx';

/**
 * Waits for the session check, sends visitors to sign-in with their intended
 * route, and rejects an authenticated user whose role is not allowed.
 */
export function ProtectedRoute({ roles, children }) {
  const { status, user, restoreError, retryRestore, logout } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <SessionLoadingPage />;
  }

  if (status === 'error') {
    return (
      <SessionErrorPage
        message={restoreError}
        onRetry={retryRestore}
        onSignOut={logout}
      />
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <ForbiddenPage userRole={user.role} allowedRoles={roles} />;
  }

  return children ?? <Outlet />;
}
