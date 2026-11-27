import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicCampaigns, isPublicCampaign } from '../api/campaigns.js';
import { AppLayout } from '../components/AppLayout.jsx';
import { CampaignStatusBadge } from '../components/CampaignStatusBadge.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { formatDate } from '../apply/format.js';

function CampaignCard({ campaign }) {
  const positions = Array.isArray(campaign.positions) ? campaign.positions : [];

  return (
    <article className="campaign-card" aria-labelledby={`campaign-${campaign.id}`}>
      <div className="campaign-card-heading">
        <div>
          {campaign.clubName ? <p className="eyebrow">{campaign.clubName}</p> : null}
          <h2 id={`campaign-${campaign.id}`}>{campaign.name}</h2>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      {campaign.description ? <p>{campaign.description}</p> : null}

      <dl className="campaign-dates">
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
      </dl>

      {positions.length ? (
        <p className="muted campaign-position-count">
          {positions.length} vị trí đang tuyển
        </p>
      ) : null}

      <Link className="btn btn-primary" to={`/campaigns/${encodeURIComponent(campaign.id)}`}>
        Xem chi tiết chiến dịch
      </Link>
    </article>
  );
}

export function PublicCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const hasLoaded = useRef(false);

  usePageTitle('Chiến dịch tuyển thành viên');

  useEffect(() => {
    let active = true;

    setErrorMessage('');
    if (hasLoaded.current) setRefreshing(true);
    else setLoadState('loading');

    async function loadCampaigns() {
      try {
        const firstPage = await getPublicCampaigns();
        if (!active) return;
        const items = Array.isArray(firstPage?.data) ? [...firstPage.data] : [];
        const totalPages = Math.max(1, Number(firstPage?.pagination?.totalPages) || 1);

        for (let page = 2; page <= totalPages; page += 1) {
          const response = await getPublicCampaigns({ page });
          if (!active) return;
          if (Array.isArray(response?.data)) items.push(...response.data);
        }

        if (!active) return;
        setCampaigns(items.filter(isPublicCampaign));
        setLoadState('ready');
        hasLoaded.current = true;
      } catch (error) {
        if (!active) return;
        setErrorMessage(error.message || 'Không thể tải danh sách chiến dịch.');
        if (!hasLoaded.current) setLoadState('error');
      } finally {
        if (active) setRefreshing(false);
      }
    }

    loadCampaigns();
    return () => {
      active = false;
    };
  }, [retryKey]);

  function refreshCampaigns() {
    setRetryKey((current) => current + 1);
  }

  if (loadState === 'loading') {
    return (
      <AppLayout>
        <section className="status-card" role="status" aria-live="polite">
          <p className="eyebrow">ClubFlow · Tuyển thành viên</p>
          <h1>Đang tải chiến dịch</h1>
          <p className="muted">Đang lấy các chiến dịch được công bố…</p>
        </section>
      </AppLayout>
    );
  }

  if (loadState === 'error') {
    return (
      <AppLayout>
        <section className="status-card" aria-labelledby="campaign-list-error-heading">
          <p className="eyebrow">Chiến dịch tuyển thành viên</p>
          <h1 id="campaign-list-error-heading">Không thể tải chiến dịch</h1>
          <div className="alert alert-error" role="alert">{errorMessage}</div>
          <button className="btn btn-primary" type="button" onClick={refreshCampaigns}>
            Thử lại
          </button>
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <section className="page-heading">
        <p className="eyebrow">ClubFlow · Cơ hội tham gia</p>
        <h1>Chiến dịch tuyển thành viên</h1>
        <p>Các chiến dịch công khai do câu lạc bộ cung cấp.</p>
      </section>

      <div className="campaign-list-toolbar">
        <p className="muted" aria-live="polite">{campaigns.length} chiến dịch</p>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={refreshCampaigns}
          disabled={refreshing}
        >
          {refreshing ? 'Đang cập nhật…' : 'Làm mới danh sách'}
        </button>
      </div>

      {errorMessage ? (
        <div className="alert alert-error" role="alert">
          {errorMessage}
          {' '}
          <button className="text-button" type="button" onClick={refreshCampaigns} disabled={refreshing}>
            Thử lại
          </button>
        </div>
      ) : null}

      {campaigns.length ? (
        <ul className="campaign-list">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <CampaignCard campaign={campaign} />
            </li>
          ))}
        </ul>
      ) : (
        <section className="panel campaign-empty" aria-labelledby="campaign-empty-heading">
          <h2 id="campaign-empty-heading">Hiện chưa có chiến dịch công khai</h2>
          <p className="muted">Các chiến dịch sẽ xuất hiện tại đây khi được công bố.</p>
        </section>
      )}
    </AppLayout>
  );
}
