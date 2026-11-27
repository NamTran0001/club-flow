import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { homeForRole, ROLE_LABEL } from '../auth/roles.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

export function HomePage() {
  const { user, status } = useAuth();
  usePageTitle('Trang chủ');

  return (
    <AppLayout>
      <section className="hero">
        <p className="eyebrow">ClubFlow</p>
        <h1>Tuyển thành viên câu lạc bộ, gọn trong một quy trình</h1>
        <p className="hero-lead">
          ClubFlow giúp Ban tổ chức công bố chiến dịch, duyệt hồ sơ, xếp lịch phỏng vấn và
          công bố kết quả; ứng viên theo dõi đúng hồ sơ của mình, người phỏng vấn chỉ thấy
          những buổi được phân công.
        </p>
        <div className="actions">
          {user ? (
            <Link className="btn btn-primary" to={homeForRole(user.role)}>
              Vào trang {ROLE_LABEL[user.role] || 'của tôi'}
            </Link>
          ) : (
            <Link className="btn btn-primary" to="/sign-in">Đăng nhập</Link>
          )}
          {status === 'error' ? (
            <span className="muted">Phiên cũ không khôi phục được. Hãy đăng nhập lại.</span>
          ) : null}
        </div>
      </section>

      <section className="info-grid" aria-labelledby="roles-heading">
        <h2 id="roles-heading">Ba vai trò, một quy trình</h2>
        <ul className="role-list">
          <li>
            <strong>Ứng viên</strong> nộp hồ sơ cho từng vị trí, chọn khung giờ phỏng vấn và
            theo dõi trạng thái, lịch phỏng vấn, kết quả của chính mình.
          </li>
          <li>
            <strong>Ban tổ chức</strong> tạo chiến dịch, duyệt hồ sơ, xếp lịch và công bố
            kết quả tuyển thành viên.
          </li>
          <li>
            <strong>Người phỏng vấn</strong> xem lịch được phân công, đọc CV và gửi đánh giá
            cho đúng buổi phỏng vấn.
          </li>
        </ul>
      </section>
    </AppLayout>
  );
}
