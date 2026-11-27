import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { getPublicCampaign, isPublicCampaign } from '../api/campaigns.js';
import { AppLayout } from '../components/AppLayout.jsx';
import { CampaignStatusBadge } from '../components/CampaignStatusBadge.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { formatDate } from '../apply/format.js';

function PositionCard({ campaign, position }) {
  return (
    <article className="position-card" aria-labelledby={`position-${position.id}`}>
      <div className="position-card-heading">
        <div>
          {position.department ? <p className="eyebrow">{position.department}</p> : null}
          <h3 id={`position-${position.id}`}>{position.name}</h3>
        </div>
        {position.quota !== undefined ? (
          <span className="badge">{position.quota} chỉ tiêu</span>
        ) : null}
      </div>
      {position.description ? <p>{position.description}</p> : null}
      {position.requirements ? (
        <p><strong>Yêu cầu:</strong> {position.requirements}</p>
      ) : null}

      {campaign.status === 'OPEN' ? (
        <Link
          className="btn btn-primary"
          to={`/apply/${encodeURIComponent(campaign.id)}/${encodeURIComponent(position.id)}`}
        >
          Ứng tuyển vị trí này
        </Link>
      ) : (
        <p className="muted position-unavailable">Chiến dịch hiện không nhận hồ sơ.</p>
      )}
    </article>
  );
}

export function CampaignDetailsPage() {
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  usePageTitle(campaign?.name || 'Chi tiết chiến dịch');

  useEffect(() => {
    let active = true;

    setLoadState('loading');
    setErrorMessage('');
    setCampaign(null);
    setUnavailable(false);

    async function loadCampaign() {
      try {
        const response = await getPublicCampaign(campaignId);
        const nextCampaign = response?.data;
        if (!isPublicCampaign(nextCampaign)) {
          if (active) {
            setUnavailable(true);
            setLoadState('unavailable');
          }
          return;
        }
        if (active) {
          setCampaign(nextCampaign);
          setLoadState('ready');
        }
      } catch (error) {
        if (!active) return;
        setErrorMessage(
          error instanceof ApiError && error.code === 'CAMPAIGN_NOT_FOUND'
            ? 'Không tìm thấy chiến dịch này.'
            : error instanceof ApiError && error.code === 'FORBIDDEN'
              ? 'Chiến dịch này không hiển thị công khai.'
              : error.message || 'Không thể tải thông tin chiến dịch.',
        );
        setLoadState('error');
      }
    }

    loadCampaign();
    return () => {
      active = false;
    };
  }, [campaignId, retryKey]);

  function retry() {
    setRetryKey((current) => current + 1);
  }

  if (loadState === 'loading') {
    return (
      <AppLayout>
        <section className="status-card" role="status" aria-live="polite">
          <p className="eyebrow">Chi tiết chiến dịch</p>
          <h1>Đang tải thông tin</h1>
          <p className="muted">Đang lấy nội dung chiến dịch từ máy chủ…</p>
        </section>
      </AppLayout>
    );
  }

  if (loadState === 'error' || loadState === 'unavailable') {
    return (
      <AppLayout>
        <section className="status-card" aria-labelledby="campaign-detail-error-heading">
          <p className="eyebrow">Chi tiết chiến dịch</p>
          <h1 id="campaign-detail-error-heading">
            {unavailable ? 'Chiến dịch không hiển thị công khai' : 'Không thể tải chiến dịch'}
          </h1>
          {errorMessage ? <div className="alert alert-error" role="alert">{errorMessage}</div> : null}
          <div className="actions">
            {!unavailable ? (
              <button className="btn btn-primary" type="button" onClick={retry}>Thử lại</button>
            ) : null}
            <Link className="btn btn-secondary" to="/">Quay lại danh sách chiến dịch</Link>
          </div>
        </section>
      </AppLayout>
    );
  }

  const positions = Array.isArray(campaign.positions) ? campaign.positions : [];

  return (
    <AppLayout>
      <nav className="breadcrumbs" aria-label="Điều hướng phân cấp">
        <Link to="/">Chiến dịch công khai</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{campaign.name}</span>
      </nav>

      <section className="campaign-detail-heading" aria-labelledby="campaign-detail-title">
        <p className="eyebrow">{campaign.clubName}</p>
        <div className="campaign-detail-title-row">
          <h1 id="campaign-detail-title">{campaign.name}</h1>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        {campaign.description ? <p className="campaign-detail-description">{campaign.description}</p> : null}
      </section>

      <section className="campaign-detail-panel" aria-labelledby="campaign-overview-heading">
        <h2 id="campaign-overview-heading">Thông tin chiến dịch</h2>
        <dl className="campaign-dates campaign-overview">
          {campaign.applicationStartDate ? (
            <div>
              <dt>Mở nhận hồ sơ</dt>
              <dd>{formatDate(campaign.applicationStartDate)}</dd>
            </div>
          ) : null}
          {campaign.applicationEndDate ? (
            <div>
              <dt>Đóng nhận hồ sơ</dt>
              <dd>{formatDate(campaign.applicationEndDate)}</dd>
            </div>
          ) : null}
          {campaign.interviewDate ? (
            <div>
              <dt>Ngày phỏng vấn dự kiến</dt>
              <dd>{formatDate(campaign.interviewDate)}</dd>
            </div>
          ) : null}
        </dl>
        {campaign.instructions ? (
          <div className="campaign-instructions">
            <h3>Hướng dẫn ứng tuyển</h3>
            <p>{campaign.instructions}</p>
          </div>
        ) : null}
      </section>

      <section className="campaign-positions-section" aria-labelledby="campaign-positions-heading">
        <div className="campaign-section-heading">
          <div>
            <p className="eyebrow">Vị trí tuyển dụng</p>
            <h2 id="campaign-positions-heading">Các vị trí trong chiến dịch</h2>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={retry}
            aria-label="Làm mới chi tiết chiến dịch"
          >
            Làm mới
          </button>
        </div>

        {positions.length ? (
          <ul className="position-list">
            {positions.map((position) => (
              <li key={position.id}>
                <PositionCard campaign={campaign} position={position} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="panel campaign-empty" role="status">
            <p>Chiến dịch chưa có vị trí tuyển dụng được liệt kê.</p>
          </div>
        )}
      </section>

      <p className="campaign-back-link">
        <Link to="/">Quay lại danh sách chiến dịch</Link>
      </p>
    </AppLayout>
  );
}
