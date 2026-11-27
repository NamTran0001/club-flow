import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { homeForRole, ROLE_LABEL } from '../auth/roles.js';

export function AppLayout({ children }) {
  const { user, status } = useAuth();
  const location = useLocation();
  const homePath = user ? homeForRole(user.role) : null;

  return (
    <>
      <a className="skip" href="#main">Bỏ qua điều hướng</a>

      <header className="site-header">
        <div className="shell head">
          <Link className="logo" to="/">
            <span className="logo-mark" aria-hidden="true">◆</span>
            ClubFlow
          </Link>

          <nav className="site-nav" aria-label="Điều hướng chính">
            {user ? (
              <>
                <Link
                  to={homePath}
                  aria-current={location.pathname === homePath ? 'page' : undefined}
                >
                  Trang chính
                </Link>
                <span className="user-chip">
                  {user.fullName} · {ROLE_LABEL[user.role] || user.role}
                </span>
                <Link className="btn btn-secondary" to="/sign-out">
                  Đăng xuất
                </Link>
              </>
            ) : status === 'loading' ? (
              <span className="muted">Đang kiểm tra phiên…</span>
            ) : (
              <Link className="btn btn-primary" to="/sign-in">Đăng nhập</Link>
            )}
          </nav>
        </div>
      </header>

      <main id="main" className="shell page">
        {children}
      </main>

      <footer className="site-footer">
        <div className="shell">
          <p>ClubFlow · CSC13008 · Giao diện React cho quy trình tuyển thành viên câu lạc bộ.</p>
        </div>
      </footer>
    </>
  );
}
