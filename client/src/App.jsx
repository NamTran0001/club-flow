import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { ROLES } from './auth/roles.js';
import { SignInPage } from './pages/SignInPage.jsx';
import { SignOutPage } from './pages/SignOutPage.jsx';
import { RoleHomePage } from './pages/RoleHomePage.jsx';
import { NotFoundPage } from './pages/SessionPages.jsx';
import { ApplicationSubmissionPage } from './pages/ApplicationSubmissionPage.jsx';
import { MyApplicationsPage } from './pages/MyApplicationsPage.jsx';
import { PublicCampaignsPage } from './pages/PublicCampaignsPage.jsx';
import { CampaignDetailsPage } from './pages/CampaignDetailsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicCampaignsPage />} />
      <Route path="/campaigns/:campaignId" element={<CampaignDetailsPage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-out" element={<SignOutPage />} />

      <Route element={<ProtectedRoute roles={[ROLES.APPLICANT]} />}>
        <Route
          path="/apply/:campaignId/:positionId"
          element={<ApplicationSubmissionPage />}
        />
        <Route
          path="/my-applications"
          element={<MyApplicationsPage />}
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
