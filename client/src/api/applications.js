import { apiRequest } from './client.js';

const encodeId = (value) => encodeURIComponent(value);

export function getCampaign(campaignId, signal) {
  return apiRequest(`/campaigns/${encodeId(campaignId)}`, { signal });
}

export function getCampaignSlots(campaignId, signal) {
  return apiRequest(`/campaigns/${encodeId(campaignId)}/slots`, { signal });
}

/**
 * Used only to detect an existing application for the same position before the
 * Applicant fills the form. A failure here must not block the form; the server
 * still rejects a duplicate submission with 409 APPLICATION_ALREADY_EXISTS.
 */
export function getMyApplications(signal) {
  return apiRequest('/applications/me?limit=100', { signal });
}

export function getApplication(applicationId, signal) {
  return apiRequest(`/applications/${encodeId(applicationId)}`, { signal });
}

export function submitApplication(formData) {
  return apiRequest('/applications', { method: 'POST', body: formData });
}
