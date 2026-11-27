import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApplicationResult, getMyApplications } from '../api/applications.js';
import { AppLayout } from '../components/AppLayout.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import {
  APPLICATION_STATUS_LABEL,
  formatDate,
  formatDateTime,
  formatTimeRange,
} from '../apply/format.js';

const PAGE_SIZE = 100;

function applicationStatusLabel(status) {
  return APPLICATION_STATUS_LABEL[status] || status;
}

function interviewStatusLabel(status) {
  if (status === 'CONFIRMED') return 'Đã xác nhận';
  if (status === 'COMPLETED') return 'Đã hoàn thành';
  return status;
}

function getPublishedResult(entry) {
  const { result } = entry;
  if (entry.resultError) return { label: 'Chưa thể tải kết quả.', className: 'muted' };
  if (result?.published === true && result.status === 'PASS') {
    return { label: 'Pass', className: 'result-pass' };
  }
  if (result?.published === true && result.status === 'FAIL') {
    return { label: 'Fail', className: 'result-fail' };
  }
  return { label: 'Chưa công bố', className: 'muted' };
}

function InterviewSchedule({ interview }) {
  if (!interview) {
    return <p className="muted application-note">Chưa có lịch phỏng vấn xác nhận.</p>;
  }

  return (
    <section className="application-subsection" aria-label="Lịch phỏng vấn">
      <h3>Lịch phỏng vấn</h3>
      <dl className="detail-list application-details">
        {interview.status ? (
          <div>
            <dt>Trạng thái lịch</dt>
            <dd>{interviewStatusLabel(interview.status)}</dd>
          </div>
        ) : null}
        {interview.startTime ? (
          <div>
            <dt>Thời gian</dt>
            <dd>
              {formatDate(interview.startTime)}
              {interview.endTime ? ` · ${formatTimeRange(interview.startTime, interview.endTime)}` : ''}
            </dd>
          </div>
        ) : null}
        {interview.room?.name ? (
          <div>
            <dt>Địa điểm</dt>
            <dd>{interview.room.name}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function ApplicationCard({ entry }) {
  const { application } = entry;
  const result = getPublishedResult(entry);

  return (
    <article className="application-card" aria-labelledby={`application-${application.id}`}>
      <div className="application-card-heading">
        <div>
          <p className="eyebrow">Hồ sơ ứng tuyển</p>
          <h2 id={`application-${application.id}`}>
            {application.positionName || 'Vị trí ứng tuyển'}
          </h2>
        </div>
        <span className="badge">{applicationStatusLabel(application.status)}</span>
      </div>

      <dl className="detail-list application-details">
        {application.campaignName ? (
          <div>
            <dt>Chiến dịch</dt>
            <dd>{application.campaignName}</dd>
          </div>
        ) : null}
        {application.submittedAt ? (
          <div>
            <dt>Ngày nộp</dt>
            <dd>{formatDateTime(application.submittedAt)}</dd>
          </div>
        ) : null}
      </dl>

      <InterviewSchedule interview={application.interview} />

      {application.status === 'SHORTLISTED' ? (
        <section className="application-subsection" aria-label="Kết quả tuyển chọn">
          <h3>Kết quả cuối cùng</h3>
          <p className={result.className}>
            {result.label === 'Pass' || result.label === 'Fail'
              ? <strong>{result.label}</strong>
              : result.label}
          </p>
        </section>
      ) : null}
    </article>
  );
}

export function MyApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoaded = useRef(false);

  usePageTitle('Hồ sơ của tôi');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const isFirstLoad = !hasLoaded.current;

    if (isFirstLoad) setLoadState('loading');
    else setRefreshing(true);
    setErrorMessage('');

    async function loadApplications() {
      try {
        const firstPage = await getMyApplications(controller.signal, 1);
        const items = Array.isArray(firstPage?.data) ? [...firstPage.data] : [];
        const totalPages = Math.max(1, Number(firstPage?.pagination?.totalPages) || 1);

        for (let page = 2; page <= totalPages; page += 1) {
          const response = await getMyApplications(controller.signal, page);
          if (Array.isArray(response?.data)) items.push(...response.data);
        }

        if (!active) return;
        const entries = await Promise.all(items.map(async (application) => {
          if (application.status !== 'SHORTLISTED') {
            return { application, result: null, resultError: false };
          }

          try {
            const response = await getApplicationResult(application.id, controller.signal);
            return {
              application,
              result: response?.data || null,
              resultError: false,
            };
          } catch (error) {
            if (error.name === 'AbortError') throw error;
            return { application, result: null, resultError: true };
          }
        }));

        if (!active) return;
        setApplications(entries);
        setLoadState('ready');
        hasLoaded.current = true;
      } catch (error) {
        if (!active || error.name === 'AbortError') return;
        setErrorMessage(error.message || 'Không thể tải hồ sơ của bạn.');
        if (isFirstLoad) setLoadState('error');
      } finally {
        if (active) setRefreshing(false);
      }
    }

    loadApplications();
    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshKey]);

  function refreshApplications() {
    setRefreshKey((current) => current + 1);
  }

  if (loadState === 'loading') {
    return (
      <AppLayout>
        <section className="status-card" role="status" aria-live="polite">
          <p className="eyebrow">C6 · Hồ sơ của tôi</p>
          <h1>Đang tải hồ sơ</h1>
          <p className="muted">Đang lấy hồ sơ ứng tuyển và thông tin kết quả đã công bố…</p>
        </section>
      </AppLayout>
    );
  }

  if (loadState === 'error') {
    return (
      <AppLayout>
        <section className="status-card" aria-labelledby="applications-error-heading">
          <p className="eyebrow">C6 · Hồ sơ của tôi</p>
          <h1 id="applications-error-heading">Không thể tải hồ sơ</h1>
          <div className="alert alert-error" role="alert">{errorMessage}</div>
          <button className="btn btn-primary" type="button" onClick={refreshApplications}>
            Thử lại
          </button>
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <section className="page-heading">
        <p className="eyebrow">C6 · Theo dõi ứng tuyển</p>
        <h1>Hồ sơ của tôi</h1>
        <p>Xem trạng thái từng hồ sơ, lịch phỏng vấn đã xác nhận và kết quả đã được công bố.</p>
      </section>

      <div className="application-list-toolbar">
        <p className="muted" aria-live="polite">
          {applications.length} hồ sơ
        </p>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={refreshApplications}
          disabled={refreshing}
        >
          {refreshing ? 'Đang cập nhật…' : 'Làm mới hồ sơ'}
        </button>
      </div>

      {errorMessage ? (
        <div className="alert alert-error" role="alert">
          {errorMessage}
          {' '}
          <button className="text-button" type="button" onClick={refreshApplications} disabled={refreshing}>
            Thử lại
          </button>
        </div>
      ) : null}

      {applications.length ? (
        <ul className="application-list">
          {applications.map((entry) => (
            <li key={entry.application.id}>
              <ApplicationCard entry={entry} />
            </li>
          ))}
        </ul>
      ) : (
        <section className="panel empty-applications" aria-labelledby="applications-empty-heading">
          <h2 id="applications-empty-heading">Chưa có hồ sơ ứng tuyển</h2>
          <p className="muted">Các hồ sơ bạn gửi sẽ xuất hiện tại đây.</p>
          <Link className="btn btn-secondary" to="/">Về trang chủ</Link>
        </section>
      )}
    </AppLayout>
  );
}
