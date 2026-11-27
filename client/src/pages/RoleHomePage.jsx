import { AppLayout } from '../components/AppLayout.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { ROLE_LABEL } from '../auth/roles.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

export function RoleHomePage({ title, step, description }) {
  const { user } = useAuth();
  usePageTitle(title);

  return (
    <AppLayout>
      <section className="page-heading" aria-labelledby="role-home-heading">
        <p className="eyebrow">{step}</p>
        <h1 id="role-home-heading">{title}</h1>
        <p>{description}</p>
      </section>

      <section className="panel" aria-labelledby="session-heading">
        <h2 id="session-heading">Phiên đăng nhập</h2>
        <dl className="detail-list">
          <div>
            <dt>Họ tên</dt>
            <dd>{user.fullName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Vai trò</dt>
            <dd>
              <span className="badge">{ROLE_LABEL[user.role] || user.role}</span>
            </dd>
          </div>
          {user.studentId ? (
            <div>
              <dt>Mã sinh viên</dt>
              <dd>{user.studentId}</dd>
            </div>
          ) : null}
        </dl>
        <p className="muted panel-note">
          Đây là trang chính của vai trò. Màn hình nghiệp vụ cho bước này sẽ được triển khai
          ở phần tiếp theo; thông tin trên được đọc từ API sau khi đăng nhập.
        </p>
      </section>
    </AppLayout>
  );
}
