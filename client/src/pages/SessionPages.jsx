import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout.jsx';
import { homeForRole, ROLE_LABEL } from '../auth/roles.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

export function SessionLoadingPage() {
  usePageTitle('Đang kiểm tra phiên đăng nhập');

  return (
    <AppLayout>
      <div className="status-card" role="status" aria-live="polite">
        <p className="eyebrow">ClubFlow</p>
        <h1>Đang kiểm tra phiên đăng nhập</h1>
        <p className="muted">
          ClubFlow đang xác nhận token đã lưu với máy chủ. Vui lòng chờ trong giây lát.
        </p>
      </div>
    </AppLayout>
  );
}

export function SessionErrorPage({ message, onRetry, onSignOut }) {
  const [retrying, setRetrying] = useState(false);
  usePageTitle('Không thể khôi phục phiên đăng nhập');

  async function handleRetry() {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <AppLayout>
      <div className="status-card">
        <p className="eyebrow">Phiên đăng nhập</p>
        <h1>Không thể khôi phục phiên đăng nhập</h1>
        <div className="alert alert-error" role="alert">
          {message || 'Máy chủ không phản hồi. Hãy thử lại.'}
        </div>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={handleRetry} disabled={retrying}>
            {retrying ? 'Đang thử lại…' : 'Thử lại'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onSignOut}>
            Đăng xuất
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

export function ForbiddenPage({ userRole, allowedRoles }) {
  usePageTitle('Không có quyền truy cập');

  return (
    <AppLayout>
      <div className="status-card">
        <p className="eyebrow">403 · Không có quyền</p>
        <h1>Bạn không có quyền truy cập trang này</h1>
        <p>
          Vai trò hiện tại là <strong>{ROLE_LABEL[userRole] || userRole}</strong>. Trang này chỉ
          dành cho {allowedRoles.map((role) => ROLE_LABEL[role] || role).join(', ')}.
        </p>
        <p className="muted">
          Hãy quay lại trang chính của vai trò bạn hoặc đăng xuất để dùng tài khoản khác.
        </p>
        <div className="actions">
          <Link className="btn btn-primary" to={homeForRole(userRole)}>
            Về trang chính của tôi
          </Link>
          <Link className="btn btn-secondary" to="/">
            Về trang chủ ClubFlow
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

export function NotFoundPage() {
  usePageTitle('Không tìm thấy trang');

  return (
    <AppLayout>
      <div className="status-card">
        <p className="eyebrow">404</p>
        <h1>Không tìm thấy trang</h1>
        <p>Địa chỉ bạn mở không tồn tại hoặc đã được thay đổi.</p>
        <Link className="btn btn-primary" to="/">Về trang chủ ClubFlow</Link>
      </div>
    </AppLayout>
  );
}
