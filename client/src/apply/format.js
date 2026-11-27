const TIME_ZONE = 'Asia/Ho_Chi_Minh';

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'long',
  timeZone: TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value) {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : String(value || '');
}

export function formatDate(value) {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : String(value || '');
}

export function formatTimeRange(start, end) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return `${start || ''} – ${end || ''}`;
  return `${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`;
}

/** Display-only labels; the status values themselves come from the API. */
export const CAMPAIGN_STATUS_LABEL = {
  DRAFT: 'Bản nháp',
  OPEN: 'Đang mở',
  CLOSED: 'Đã đóng',
  CONFIRMED: 'Đã xác nhận lịch',
  COMPLETED: 'Đã hoàn thành',
};

export const APPLICATION_STATUS_LABEL = {
  PENDING: 'Chờ duyệt CV',
  SHORTLISTED: 'Đã qua vòng CV',
  REJECTED: 'Chưa đạt vòng CV',
};
