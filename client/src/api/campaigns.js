import { apiRequest } from './client.js';

const PUBLIC_CAMPAIGN_STATUSES = new Set(['OPEN', 'CONFIRMED']);
const CAMPAIGN_PAGE_SIZE = 100;
const pendingCampaignRequests = new Map();

function requestPublicCampaignData(path) {
  const existingRequest = pendingCampaignRequests.get(path);
  if (existingRequest) return existingRequest;

  const request = apiRequest(path, { auth: false });
  pendingCampaignRequests.set(path, request);
  request.then(
    () => {
      if (pendingCampaignRequests.get(path) === request) pendingCampaignRequests.delete(path);
    },
    () => {
      if (pendingCampaignRequests.get(path) === request) pendingCampaignRequests.delete(path);
    },
  );
  return request;
}

export function isPublicCampaign(campaign) {
  return PUBLIC_CAMPAIGN_STATUSES.has(campaign?.status);
}

export function getPublicCampaigns({ page = 1 } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(CAMPAIGN_PAGE_SIZE),
  });

  return requestPublicCampaignData(`/campaigns?${query}`);
}

export function getPublicCampaign(campaignId) {
  return requestPublicCampaignData(`/campaigns/${encodeURIComponent(campaignId)}`);
}
