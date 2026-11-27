import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { ROLES } from './auth/roles.js';
import { HomePage } from './pages/HomePage.jsx';
import { SignInPage } from './pages/SignInPage.jsx';
import { SignOutPage } from './pages/SignOutPage.jsx';
import { RoleHomePage } from './pages/RoleHomePage.jsx';
import { NotFoundPage } from './pages/SessionPages.jsx';
import { ApplicationSubmissionPage } from './pages/ApplicationSubmissionPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-out" element={<SignOutPage />} />

      <Route element={<ProtectedRoute roles={[ROLES.APPLICANT]} />}>
        <Route
          path="/apply/:campaignId/:positionId"
          element={<ApplicationSubmissionPage />}
        />
        <Route
          path="/my-applications"
          element={
            <RoleHomePage
              step="C6 · My applications"
              title="Trang chính của ứng viên"
              description="Theo dõi hồ sơ đã nộp, trạng thái duyệt CV, lịch phỏng vấn và kết quả của từng vị trí."
            />
          }
        />
      </Route>

      <Route element={<ProtectedRoute roles={[ROLES.EXECUTIVE]} />}>
        <Route
          path="/exec/applications"
          element={
            <RoleHomePage
              step="C7 · Application review"
              title="Trang chính của Ban tổ chức"
              description="Quản lý chiến dịch, duyệt hồ sơ, xếp lịch phỏng vấn và công bố kết quả tuyển thành viên."
            />
          }
        />
      </Route>

      <Route element={<ProtectedRoute roles={[ROLES.INTERVIEWER]} />}>
        <Route
          path="/interviewer/interviews"
          element={
            <RoleHomePage
              step="C10 · Assigned interviews"
              title="Trang chính của người phỏng vấn"
              description="Xem những buổi phỏng vấn được phân công, đọc CV của ứng viên và gửi đánh giá."
            />
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
