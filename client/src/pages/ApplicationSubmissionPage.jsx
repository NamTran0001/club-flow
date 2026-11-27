import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import {
  getCampaign,
  getCampaignSlots,
  getApplication,
  getMyApplications,
  submitApplication,
} from '../api/applications.js';
import { AppLayout } from '../components/AppLayout.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import {
  FIELD_ORDER,
  MAX_CV_LABEL,
  MAX_MOTIVATION_WORDS,
  countWords,
  formatBytes,
  mapServerDetails,
  validateApplication,
  validateCvFile,
} from '../apply/validation.js';
import {
  APPLICATION_STATUS_LABEL,
  CAMPAIGN_STATUS_LABEL,
  formatDate,
  formatDateTime,
  formatTimeRange,
} from '../apply/format.js';

const EMPTY_VALUES = {
  studentId: '',
  fullName: '',
  email: '',
  phone: '',
  motivationStatement: '',
  availabilitySlotIds: [],
};

function isWithinApplicationPeriod(campaign, now = Date.now()) {
  const start = Date.parse(campaign?.applicationStartDate);
  const end = Date.parse(campaign?.applicationEndDate);
  return Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end;
}

function existingApplicationFor(items, campaignId, positionId) {
  return items.find(
    (application) =>
      application.campaignId === campaignId && application.positionId === positionId,
  ) || null;
}

function FieldError({ id, children }) {
  if (!children) return null;
  return <p className="field-error" id={id}>{children}</p>;
}

function ExistingApplication({ application }) {
  const identifier = application.applicationCode || application.id;

  return (
    <section className="status-card" aria-labelledby="duplicate-heading">
      <p className="eyebrow">Hồ sơ đã tồn tại</p>
      <h2 id="duplicate-heading">Bạn đã nộp đơn cho vị trí này</h2>
      <p>
        Mỗi ứng viên chỉ có thể nộp một hồ sơ cho một vị trí trong chiến dịch.
        Hồ sơ hiện có: <strong>{identifier}</strong>.
      </p>
      <dl className="detail-list application-detail">
        {application.status ? (
          <div><dt>Trạng thái</dt><dd>{APPLICATION_STATUS_LABEL[application.status] || application.status}</dd></div>
        ) : null}
        {application.submittedAt ? (
          <div><dt>Ngày nộp</dt><dd>{formatDateTime(application.submittedAt)}</dd></div>
        ) : null}
        {application.cvFileName ? (
          <div><dt>Tệp CV</dt><dd>{application.cvFileName}</dd></div>
        ) : null}
        {application.motivationStatement ? (
          <div><dt>Thư động lực</dt><dd>{application.motivationStatement}</dd></div>
        ) : null}
      </dl>
      <p className="panel-note">
        Đã mở hồ sơ hiện có bằng mã hồ sơ do máy chủ trả về.
      </p>
      <Link className="btn btn-primary" to="/my-applications">Quay lại danh sách hồ sơ</Link>
    </section>
  );
}

export function ApplicationSubmissionPage() {
  const { campaignId, positionId } = useParams();
  const { user } = useAuth();
  const [retryKey, setRetryKey] = useState(0);
  const [loadState, setLoadState] = useState({ status: 'loading', error: '', campaign: null, slots: [] });
  const [existing, setExisting] = useState(null);
  const [existingCheckWarning, setExistingCheckWarning] = useState('');
  const [values, setValues] = useState(() => ({
    ...EMPTY_VALUES,
    studentId: user?.studentId || '',
    fullName: user?.fullName || '',
    email: user?.email || '',
  }));
  const [cv, setCv] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const controlRefs = useRef({});
  const fileRef = useRef(null);
  const [isPeriodOpen, setIsPeriodOpen] = useState(true);
  const wordCount = useMemo(() => countWords(values.motivationStatement), [values.motivationStatement]);

  usePageTitle('Nộp hồ sơ');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadForm() {
      setLoadState({ status: 'loading', error: '', campaign: null, slots: [] });
      setExisting(null);
      setExistingCheckWarning('');
      setSuccess(null);
      setValues({
        ...EMPTY_VALUES,
        studentId: user?.studentId || '',
        fullName: user?.fullName || '',
        email: user?.email || '',
      });
      setCv(null);
      setFieldErrors({});
      setSubmitError('');
      setIsPeriodOpen(true);

      try {
        const response = await getCampaign(campaignId, controller.signal);
        const campaign = response?.data;
        const position = campaign?.positions?.find((item) => item.id === positionId);
        if (!campaign || !position) {
          throw new Error('Không tìm thấy chiến dịch hoặc vị trí tuyển dụng này.');
        }

        if (campaign.status !== 'OPEN') {
          if (active) {
            setLoadState({
              status: 'closed',
              error: '',
              campaign,
              slots: [],
            });
          }
          return;
        }

        const withinPeriod = isWithinApplicationPeriod(campaign);
        if (active) setIsPeriodOpen(withinPeriod);

        const [slotResult, applicationResult] = await Promise.allSettled([
          getCampaignSlots(campaignId, controller.signal),
          getMyApplications(controller.signal),
        ]);

        if (!active) return;

        if (slotResult.status === 'rejected') {
          throw slotResult.reason;
        }

        const slots = Array.isArray(slotResult.value?.data) ? slotResult.value.data : [];
        setLoadState({ status: 'ready', error: '', campaign, slots });

        if (applicationResult.status === 'fulfilled') {
          const items = Array.isArray(applicationResult.value?.data) ? applicationResult.value.data : [];
          const existingSummary = existingApplicationFor(items, campaignId, positionId);
          if (existingSummary) {
            try {
              const detailResponse = await getApplication(existingSummary.id, controller.signal);
              setExisting(detailResponse?.data || existingSummary);
            } catch {
              setExisting(existingSummary);
            }
          }
        } else {
          setExistingCheckWarning(
            'Chưa thể kiểm tra hồ sơ cũ. Máy chủ vẫn sẽ kiểm tra trùng lặp khi bạn gửi.',
          );
        }
      } catch (error) {
        if (!active || error.name === 'AbortError') return;
        const message = error.status === 403
          ? 'Chiến dịch này không mở cho hồ sơ ứng viên.'
          : error.message || 'Không thể tải thông tin chiến dịch.';
        setLoadState({ status: 'error', error: message, campaign: null, slots: [] });
      }
    }

    loadForm();
    return () => {
      active = false;
      controller.abort();
    };
  }, [campaignId, positionId, retryKey, user]);

  const campaign = loadState.campaign;
  const position = campaign?.positions?.find((item) => item.id === positionId);

  function updateValue(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
  }

  function updateAvailability(slotId, checked) {
    setValues((current) => {
      const currentIds = current.availabilitySlotIds;
      return {
        ...current,
        availabilitySlotIds: checked
          ? [...new Set([...currentIds, slotId])]
          : currentIds.filter((id) => id !== slotId),
      };
    });
    setFieldErrors((current) => ({ ...current, availabilitySlotIds: '' }));
    setSubmitError('');
  }

  async function updateCv(event) {
    const selected = event.target.files?.[0] || null;
    setCv(selected);
    setFieldErrors((current) => ({ ...current, cv: '' }));
    setSubmitError('');
    if (selected) {
      const error = await validateCvFile(selected);
      if (error) setFieldErrors((current) => ({ ...current, cv: error }));
    }
  }

  async function focusFirstError(errors) {
    const firstField = FIELD_ORDER.find((field) => errors[field]);
    if (firstField === 'cv') {
      fileRef.current?.focus();
      return;
    }
    const control = controlRefs.current[firstField];
    if (control) control.focus();
    else if (firstField === 'availabilitySlotIds') {
      controlRefs.current.availabilitySlotIds?.focus();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitLock.current || submitting) return;
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError('');
    setSuccess(null);

    try {
      const errors = validateApplication(values);
      const fileError = await validateCvFile(cv);
      if (fileError) errors.cv = fileError;

      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        await focusFirstError(errors);
        return;
      }

      if (!campaign || campaign.status !== 'OPEN' || !isWithinApplicationPeriod(campaign)) {
        setIsPeriodOpen(false);
        setSubmitError('Chiến dịch không còn nhận hồ sơ trong thời gian hiện tại.');
        return;
      }

      const duplicate = existing || null;
      if (duplicate) {
        setSubmitError('');
        return;
      }

      const formData = new FormData();
      formData.append('campaignId', campaignId);
      formData.append('positionId', positionId);
      formData.append('studentId', values.studentId.trim());
      formData.append('fullName', values.fullName.trim());
      formData.append('email', values.email.trim());
      formData.append('phone', values.phone.trim());
      formData.append('cv', cv);
      formData.append('motivationStatement', values.motivationStatement.trim());
      formData.append('availabilitySlotIds', JSON.stringify(values.availabilitySlotIds));

      const response = await submitApplication(formData);
      setSuccess(response?.data || {});
      setExisting(null);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'APPLICATION_ALREADY_EXISTS') {
        const applicationId = error.error?.existingApplicationId;
        if (applicationId) {
          const existingSummary = {
            id: applicationId,
            applicationCode: error.error?.existingApplicationCode || '',
            campaignId,
            positionId,
          };
          try {
            const detailResponse = await getApplication(applicationId);
            setExisting(detailResponse?.data || existingSummary);
          } catch {
            setExisting(existingSummary);
          }
          setSubmitError('');
          return;
        }
      }

      if (error instanceof ApiError) {
        const mapped = mapServerDetails(error.details);
        if (error.code === 'INVALID_CV_FORMAT') mapped.cv = 'Tệp đã chọn không phải PDF hợp lệ.';
        if (error.code === 'CV_TOO_LARGE') mapped.cv = `CV không được vượt quá ${MAX_CV_LABEL}.`;
        if (error.code === 'MOTIVATION_TOO_LONG') {
          mapped.motivationStatement = `Thư động lực tối đa ${MAX_MOTIVATION_WORDS} từ.`;
        }
        if (Object.keys(mapped).length) {
          setFieldErrors(mapped);
          await focusFirstError(mapped);
        }
        if (error.code === 'CAMPAIGN_CLOSED') {
          setIsPeriodOpen(false);
          setSubmitError('Chiến dịch đã đóng hoặc đã hết thời gian nhận hồ sơ.');
        } else {
          setSubmitError(error.message || 'Không thể gửi hồ sơ. Vui lòng thử lại.');
        }
      } else {
        setSubmitError(error.message || 'Không thể gửi hồ sơ. Vui lòng thử lại.');
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  if (loadState.status === 'loading') {
    return (
      <AppLayout>
        <section className="status-card" aria-live="polite">
          <h1>Đang tải biểu mẫu</h1>
          <p className="muted">Đang lấy thông tin chiến dịch, vị trí và khung giờ phỏng vấn…</p>
        </section>
      </AppLayout>
    );
  }

  if (loadState.status === 'error') {
    return (
      <AppLayout>
        <section className="status-card" aria-labelledby="application-load-error">
          <p className="eyebrow">Không thể mở biểu mẫu</p>
          <h1 id="application-load-error">Chưa tải được thông tin</h1>
          <p>{loadState.error}</p>
          <div className="actions">
            <button className="btn btn-primary" type="button" onClick={() => setRetryKey((key) => key + 1)}>
              Thử lại
            </button>
            <Link className="btn btn-secondary" to="/">Về trang chủ</Link>
          </div>
        </section>
      </AppLayout>
    );
  }

  if (loadState.status === 'closed') {
    return (
      <AppLayout>
        <section className="status-card" aria-labelledby="application-closed-heading">
          <p className="eyebrow">Không nhận hồ sơ</p>
          <h1 id="application-closed-heading">Chiến dịch không mở nhận đơn</h1>
          <p>
            {campaign?.name} hiện ở trạng thái {CAMPAIGN_STATUS_LABEL[campaign?.status] || campaign?.status}.
            Chỉ có thể gửi hồ sơ khi chiến dịch đang mở.
          </p>
          <Link className="btn btn-secondary" to="/">Về trang chủ</Link>
        </section>
      </AppLayout>
    );
  }

  if (existing) {
    return (
      <AppLayout>
        <section className="page-heading">
          <p className="eyebrow">C5 · Nộp hồ sơ</p>
          <h1>Hồ sơ ứng tuyển</h1>
          <p>{campaign.name} · {position.name}</p>
        </section>
        <ExistingApplication application={existing} />
      </AppLayout>
    );
  }

  if (success) {
    const appIdentifier = success.applicationCode || success.id;
    return (
      <AppLayout>
        <section className="status-card alert-success" aria-live="polite" aria-labelledby="application-success-heading">
          <p className="eyebrow">Đã gửi hồ sơ</p>
          <h1 id="application-success-heading">Hồ sơ của bạn đã được ghi nhận</h1>
          {appIdentifier ? <p>Mã hồ sơ: <strong>{appIdentifier}</strong></p> : null}
          <p>Vị trí: {position.name} · Chiến dịch: {campaign.name}</p>
          <p>
            Trạng thái: {APPLICATION_STATUS_LABEL[success.status] || success.status || 'PENDING'}
          </p>
          <div className="actions">
            <Link className="btn btn-primary" to="/my-applications">Xem hồ sơ của tôi</Link>
            <Link className="btn btn-secondary" to="/">Về trang chủ</Link>
          </div>
        </section>
      </AppLayout>
    );
  }

  const canSubmit = isPeriodOpen && !existing && !submitting;
  const hasAvailabilityError = Boolean(fieldErrors.availabilitySlotIds);

  return (
    <AppLayout>
      <section className="page-heading">
        <p className="eyebrow">C5 · Nộp hồ sơ ứng tuyển</p>
        <h1>Nộp hồ sơ cho {position.name}</h1>
        <p>{campaign.name} · {position.department}</p>
      </section>

      <section className="panel application-panel" aria-labelledby="application-form-heading">
        <div className="campaign-summary">
          <h2 id="application-form-heading">Thông tin vị trí</h2>
          {position.description ? <p>{position.description}</p> : null}
          {position.requirements ? <p><strong>Yêu cầu:</strong> {position.requirements}</p> : null}
          <p className="muted">
            Hạn nhận hồ sơ: {formatDate(campaign.applicationEndDate)}
          </p>
        </div>

        {!isPeriodOpen ? (
          <div className="alert alert-error" role="status">
            Thời gian nhận hồ sơ đã bắt đầu kết thúc hoặc chưa mở. Không thể gửi hồ sơ cho chiến dịch này.
          </div>
        ) : null}

        {existingCheckWarning ? (
          <div className="alert alert-warning" role="status">{existingCheckWarning}</div>
        ) : null}

        {submitError ? (
          <div className="alert alert-error" role="alert">{submitError}</div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="studentId">Mã sinh viên</label>
              <input
                id="studentId"
                name="studentId"
                autoComplete="off"
                value={values.studentId}
                onChange={updateValue}
                aria-invalid={Boolean(fieldErrors.studentId)}
                aria-describedby={fieldErrors.studentId ? 'studentId-error' : undefined}
                ref={(node) => { controlRefs.current.studentId = node; }}
              />
              <FieldError id="studentId-error">{fieldErrors.studentId}</FieldError>
            </div>

            <div className="field">
              <label htmlFor="fullName">Họ và tên</label>
              <input
                id="fullName"
                name="fullName"
                autoComplete="name"
                maxLength={150}
                value={values.fullName}
                onChange={updateValue}
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
                ref={(node) => { controlRefs.current.fullName = node; }}
              />
              <FieldError id="fullName-error">{fieldErrors.fullName}</FieldError>
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={updateValue}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                ref={(node) => { controlRefs.current.email = node; }}
              />
              <FieldError id="email-error">{fieldErrors.email}</FieldError>
            </div>

            <div className="field">
              <label htmlFor="phone">Số điện thoại</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={20}
                value={values.phone}
                onChange={updateValue}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                ref={(node) => { controlRefs.current.phone = node; }}
              />
              <FieldError id="phone-error">{fieldErrors.phone}</FieldError>
            </div>
          </div>

          <div className="field">
            <label htmlFor="cv">CV (PDF, tối đa {MAX_CV_LABEL})</label>
            <input
              id="cv"
              name="cv"
              type="file"
              accept=".pdf,application/pdf"
              onChange={updateCv}
              aria-invalid={Boolean(fieldErrors.cv)}
              aria-describedby={fieldErrors.cv ? 'cv-error' : 'cv-hint'}
              ref={fileRef}
            />
            <p className="field-hint" id="cv-hint">
              Chỉ nhận tệp PDF có dung lượng không quá {MAX_CV_LABEL}.
              {cv ? ` Đã chọn: ${cv.name} (${formatBytes(cv.size)}).` : ''}
            </p>
            <FieldError id="cv-error">{fieldErrors.cv}</FieldError>
          </div>

          <div className="field">
            <label htmlFor="motivationStatement">Thư động lực</label>
            <textarea
              id="motivationStatement"
              name="motivationStatement"
              rows="6"
              value={values.motivationStatement}
              onChange={updateValue}
              aria-invalid={Boolean(fieldErrors.motivationStatement)}
              aria-describedby={fieldErrors.motivationStatement
                ? 'motivationStatement-error motivation-word-count'
                : 'motivation-word-count'}
              ref={(node) => { controlRefs.current.motivationStatement = node; }}
            />
            <p className="field-hint" id="motivation-word-count">
              {wordCount}/{MAX_MOTIVATION_WORDS} từ
            </p>
            <FieldError id="motivationStatement-error">{fieldErrors.motivationStatement}</FieldError>
          </div>

          <fieldset
            className={`availability-fieldset${hasAvailabilityError ? ' has-error' : ''}`}
            aria-describedby={hasAvailabilityError ? 'availabilitySlotIds-error' : 'availability-hint'}
          >
            <legend>Khung giờ bạn có thể tham gia phỏng vấn</legend>
            <p className="field-hint" id="availability-hint">
              Chọn ít nhất một khung giờ. Đây là nguyện vọng về thời gian, chưa phải lịch phỏng vấn xác nhận.
            </p>
            {loadState.slots.length ? (
              <ul className="slot-list">
                {loadState.slots.map((slot, index) => {
                  const inputId = `slot-${index}`;
                  return (
                    <li key={slot.id}>
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={values.availabilitySlotIds.includes(slot.id)}
                        onChange={(event) => updateAvailability(slot.id, event.target.checked)}
                        ref={index === 0
                          ? (node) => { controlRefs.current.availabilitySlotIds = node; }
                          : undefined}
                      />
                      <label htmlFor={inputId}>
                        {formatDate(slot.startTime)} · {formatTimeRange(slot.startTime, slot.endTime)}
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="field-error">Chiến dịch chưa có khung giờ để chọn. Vui lòng liên hệ Ban tổ chức.</p>
            )}
            <FieldError id="availabilitySlotIds-error">{fieldErrors.availabilitySlotIds}</FieldError>
          </fieldset>

          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={!canSubmit || !loadState.slots.length}>
              {submitting ? 'Đang gửi hồ sơ…' : 'Gửi hồ sơ'}
            </button>
            <Link className="btn btn-secondary" to="/">Hủy</Link>
            {submitting ? <span className="muted" role="status">Đang tải tệp lên. Không đóng trang này.</span> : null}
          </div>
        </form>
      </section>
    </AppLayout>
  );
}
