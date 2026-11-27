const API_BASE = '/api';

let tokenProvider = () => null;
let unauthorizedHandler = null;

/**
 * Connect the API client to the authentication context without creating a
 * circular import. The token is read for every protected request.
 */
export function configureApiAuth({ getToken, onUnauthorized } = {}) {
  if (getToken) tokenProvider = getToken;
  if (onUnauthorized !== undefined) unauthorizedHandler = onUnauthorized;
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', details = null, error = null, payload = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.error = error;
    this.payload = payload;
  }
}

function messageFromPayload(payload, fallback) {
  if (payload && typeof payload === 'object' && typeof payload.message === 'string' && payload.message) {
    return payload.message;
  }
  return fallback;
}

/**
 * The only place in the client that calls fetch for ClubFlow API resources.
 * Paths are always relative to /api and never contain a host name.
 */
export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    auth = true,
    signal,
    handleUnauthorized = true,
  } = options;

  const requestHeaders = { Accept: 'application/json', ...headers };
  let requestBody = body;

  if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const token = auth ? tokenProvider() : null;
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError('Không thể kết nối tới máy chủ. Hãy kiểm tra Mock API đang chạy.', {
      code: 'NETWORK_ERROR',
    });
  }

  const contentType = response.headers.get('content-type') || '';
  let payload = null;

  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  } else {
    payload = await response.text().catch(() => '');
  }

  const isErrorEnvelope =
    payload && typeof payload === 'object' && payload.success === false;

  if (!response.ok || isErrorEnvelope) {
    const apiError = payload && typeof payload === 'object' ? payload.error : null;
    const apiException = new ApiError(
      messageFromPayload(payload, `Yêu cầu thất bại với mã ${response.status}.`),
      {
        status: response.status,
        code: apiError?.code || 'REQUEST_FAILED',
        details: apiError?.details || null,
        error: apiError,
        payload,
      },
    );

    if (response.status === 401 && auth && handleUnauthorized && unauthorizedHandler) {
      unauthorizedHandler();
    }

    throw apiException;
  }

  return payload;
}
