import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

/**
 * Logout runs on its own public route so the protected page does not redirect
 * to sign-in with a stale "from" location while the session is being cleared.
 */
export function SignOutPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);
  usePageTitle('Đang đăng xuất');

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    logout().finally(() => {
      navigate('/sign-in', { replace: true, state: null });
    });
  }, [logout, navigate]);

  return (
    <AppLayout>
      <div className="status-card" role="status" aria-live="polite">
        <p className="eyebrow">C2 · Đăng xuất</p>
        <h1>Đang đăng xuất</h1>
        <p className="muted">ClubFlow đang xoá phiên đăng nhập trên trình duyệt.</p>
      </div>
    </AppLayout>
  );
}
