const STATUS_LABELS = {
  DRAFT: 'Bản nháp',
  OPEN: 'Đang nhận hồ sơ',
  CLOSED: 'Đã đóng',
  CONFIRMED: 'Đã xác nhận lịch',
  COMPLETED: 'Đã hoàn thành',
};

export function CampaignStatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status;
  const statusClass = status === 'OPEN' ? 'campaign-status-open' : 'campaign-status-confirmed';

  return <span className={`badge campaign-status ${statusClass}`}>{label}</span>;
}
