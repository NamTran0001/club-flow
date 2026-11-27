/**
 * Client-side rules for the C5 application form. These mirror the limits in
 * docs/api/applications.md; the server remains the authority for every rule.
 */

export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const MAX_CV_LABEL = '5 MB';
export const MAX_MOTIVATION_WORDS = 300;

/** Form order, used to focus the first invalid control after a failed submit. */
export const FIELD_ORDER = [
  'studentId',
  'fullName',
  'email',
  'phone',
  'cv',
  'motivationStatement',
  'availabilitySlotIds',
];

/**
 * The API counts words with trim().split(/\s+/).filter(Boolean), so the counter
 * in the form must use exactly the same rule to agree with the server.
 */
export function countWords(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

async function hasPdfSignature(file) {
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return (
    header.length === 5 &&
    header[0] === 0x25 && // %
    header[1] === 0x50 && // P
    header[2] === 0x44 && // D
    header[3] === 0x46 && // F
    header[4] === 0x2d // -
  );
}

/**
 * Returns an empty string when the file is acceptable, otherwise a message.
 * Checks the extension/MIME type, the size and the %PDF- signature so a
 * renamed text file cannot pass as a PDF.
 */
export async function validateCvFile(file) {
  if (!file) return 'Vui lòng chọn CV dạng PDF.';
  if (!/\.pdf$/i.test(file.name || '')) return 'CV phải là tệp PDF (.pdf).';
  if (file.type && file.type !== 'application/pdf') return 'CV phải là tệp PDF (.pdf).';
  if (file.size === 0) return 'Tệp CV đang trống. Vui lòng chọn tệp khác.';
  if (file.size > MAX_CV_BYTES) return `CV không được vượt quá ${MAX_CV_LABEL}.`;
  if (!(await hasPdfSignature(file))) return 'Tệp đã chọn không phải PDF hợp lệ.';
  return '';
}

export function validateApplication(values) {
  const errors = {};

  const studentId = String(values.studentId || '').trim();
  if (!studentId) errors.studentId = 'Vui lòng nhập mã sinh viên.';
  else if (studentId.length < 4 || studentId.length > 20) {
    errors.studentId = 'Mã sinh viên phải có từ 4 đến 20 ký tự.';
  }

  const fullName = String(values.fullName || '').trim();
  if (!fullName) errors.fullName = 'Vui lòng nhập họ và tên.';
  else if (fullName.length > 150) errors.fullName = 'Họ và tên tối đa 150 ký tự.';

  const email = String(values.email || '').trim();
  if (!email) errors.email = 'Vui lòng nhập email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email không đúng định dạng.';

  const phone = String(values.phone || '').trim();
  if (!phone) errors.phone = 'Vui lòng nhập số điện thoại.';
  else if (phone.length < 8 || phone.length > 20) {
    errors.phone = 'Số điện thoại phải có từ 8 đến 20 ký tự.';
  }

  const statement = String(values.motivationStatement || '').trim();
  if (!statement) errors.motivationStatement = 'Vui lòng nhập thư động lực.';
  const words = countWords(statement);
  if (words > MAX_MOTIVATION_WORDS) {
    errors.motivationStatement = `Thư động lực tối đa ${MAX_MOTIVATION_WORDS} từ (hiện ${words} từ).`;
  }

  if (!Array.isArray(values.availabilitySlotIds) || values.availabilitySlotIds.length === 0) {
    errors.availabilitySlotIds = 'Vui lòng chọn ít nhất một khung giờ phỏng vấn.';
  }

  return errors;
}

/** Keeps only the field-level details the form knows how to display. */
export function mapServerDetails(details) {
  const mapped = {};
  if (!details || typeof details !== 'object') return mapped;
  for (const field of FIELD_ORDER) {
    if (typeof details[field] === 'string' && details[field]) {
      mapped[field] = details[field];
    }
  }
  return mapped;
}
