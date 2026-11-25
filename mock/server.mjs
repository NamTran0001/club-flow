#!/usr/bin/env node
// ClubFlow mock API. Node 18+, built-in modules only.
//
//   node mock/server.mjs
//
// Environment:
//   PORT=3001          port to listen on
//   MOCK_MODE=normal   normal | slow | error | empty
//
// The mock starts from mock/data/, keeps changes in memory, and resets on
// restart. Tokens are stateless (`token-<userId>`), so they survive a restart.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, 'data');
const PORT = Number(process.env.PORT || 3001);
const MODE = (process.env.MOCK_MODE || 'normal').toLowerCase();
const VALID_MODES = new Set(['normal', 'slow', 'error', 'empty']);
if (!VALID_MODES.has(MODE)) {
  console.error(`MOCK_MODE must be normal, slow, error or empty (got "${MODE}")`);
  process.exit(1);
}

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
const db = {
  users: readJson('users.json'),
  campaigns: readJson('campaigns.json'),
  applications: readJson('applications.json'),
  interviewers: readJson('interviewers.json'),
  rooms: readJson('rooms.json'),
  slots: readJson('slots.json'),
  schedule: readJson('schedule.json'),
  assessments: readJson('assessments.json'),
  results: readJson('results.json'),
  notifications: readJson('notifications.json'),
};
const SEED_SCHEDULE = structuredClone(db.schedule);

let nextCampaign = 3;
let nextPosition = 301;
let nextApplication = 9;
let nextInterview = 6;
let nextAssessment = 102;
let nextNotification = 102;

const now = () => new Date().toISOString();
const pad = (n) => String(n).padStart(3, '0');
const campaignById = (id) => db.campaigns.find((c) => c.id === id);
const applicationById = (id) => db.applications.find((a) => a.id === id);
const positionOf = (campaign, positionId) =>
  campaign?.positions.find((p) => p.id === positionId) || null;
const publicUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};
const publicNotification = ({ applicantId, ...rest }) => rest;

// --------------------------------------------------------------------------
// HTTP helpers
function sendJson(res, status, body) {
  const shaped = MODE === 'empty' ? emptyLists(body) : body;
  const text = JSON.stringify(shaped);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(text);
}
function ok(res, data, extra = {}) {
  sendJson(res, 200, { success: true, ...extra, data });
}
function created(res, data, message) {
  sendJson(res, 201, { success: true, message, data });
}
function fail(res, status, code, message, details) {
  const error = { code };
  if (details !== undefined) error.details = details;
  sendJson(res, status, { success: false, message, error });
}
function emptyLists(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (
        typeof item === 'number' &&
        /^(total|totalApplications|pending|shortlisted|rejected|proposed|conflict|unassigned|totalItems|totalPages|count)$/i.test(key)
      ) {
        out[key] = 0;
      } else {
        out[key] = emptyLists(item);
      }
    }
    return out;
  }
  return value;
}

function paginate(items, url) {
  const rawPage = Number.parseInt(url.searchParams.get('page') || '1', 10);
  const rawLimit = Number.parseInt(url.searchParams.get('limit') || '10', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 10;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      totalItems: items.length,
      totalPages: items.length === 0 ? 0 : Math.ceil(items.length / limit),
    },
  };
}

function authUser(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  const id = token.startsWith('token-') ? token.slice('token-'.length) : null;
  return id ? db.users[id] || null : null;
}
function requireUser(req, res) {
  const user = authUser(req);
  if (!user) {
    fail(res, 401, 'UNAUTHORIZED', 'Authentication is required');
    return null;
  }
  return user;
}
function requireRole(req, res, roles) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (!roles.includes(user.role)) {
    fail(res, 403, 'FORBIDDEN', 'You do not have permission for this action');
    return null;
  }
  return user;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}
async function readJsonBody(req, res) {
  const raw = await readBody(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    fail(res, 400, 'INVALID_JSON', 'The request body is not valid JSON');
    return null;
  }
}

function parseMultipart(buffer, boundary) {
  const fields = {};
  const delimiter = Buffer.from(`--${boundary}`);
  let index = buffer.indexOf(delimiter);
  while (index !== -1) {
    const next = buffer.indexOf(delimiter, index + delimiter.length);
    if (next === -1) break;
    const part = buffer.subarray(index + delimiter.length, next);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd !== -1) {
      const header = part.subarray(0, headerEnd).toString('utf8');
      let content = part.subarray(headerEnd + 4);
      if (content.subarray(-2).toString() === '\r\n') content = content.subarray(0, -2);
      const name = header.match(/name="([^"]+)"/i);
      const filename = header.match(/filename="([^"]*)"/i);
      if (name) {
        if (filename) {
          fields[name[1]] = {
            filename: filename[1],
            data: content,
          };
        } else {
          fields[name[1]] = content.toString('utf8');
        }
      }
    }
    index = next;
  }
  return fields;
}

// --------------------------------------------------------------------------
// Domain helpers
function campaignName(id) {
  return campaignById(id)?.name || '';
}
function positionName(campaignId, positionId) {
  return positionOf(campaignById(campaignId), positionId)?.name || '';
}
function applicationSummary(app) {
  return {
    id: app.id,
    campaignId: app.campaignId,
    campaignName: campaignName(app.campaignId),
    positionId: app.positionId,
    positionName: positionName(app.campaignId, app.positionId),
    studentId: app.studentId,
    fullName: app.fullName,
    email: app.email,
    status: app.status,
    submittedAt: app.submittedAt,
  };
}
function applicationDetails(app, includeNotes) {
  const data = {
    id: app.id,
    campaignId: app.campaignId,
    campaignName: campaignName(app.campaignId),
    positionId: app.positionId,
    positionName: positionName(app.campaignId, app.positionId),
    studentId: app.studentId,
    fullName: app.fullName,
    email: app.email,
    phone: app.phone,
    cvUrl: `/api/applications/${app.id}/cv`,
    cvFileName: app.cvFileName,
    cvSizeBytes: app.cvSizeBytes,
    motivationStatement: app.motivationStatement,
    status: app.status,
    submittedAt: app.submittedAt,
  };
  if (includeNotes) data.internalNotes = app.internalNotes || '';
  return data;
}
function applicationsOf(campaignId) {
  return db.applications.filter((a) => a.campaignId === campaignId);
}
function applicationCode(app) {
  if (!app) return '';
  const number = Number(app.id.replace('application_', ''));
  return `A${String(number).padStart(2, '0')}`;
}
const isoVN = (date) => {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return `${shifted.toISOString().slice(0, 19)}+07:00`;
};

function scheduleFor(campaignId) {
  return db.schedule[campaignId] || null;
}
function allEntries() {
  return Object.values(db.schedule).flatMap((s) => s.entries);
}
function findEntry(entryId) {
  for (const schedule of Object.values(db.schedule)) {
    const entry = schedule.entries.find((e) => e.id === entryId);
    if (entry) return { schedule, entry };
  }
  return null;
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}
function interviewerBusy(interviewerId, start, end, exceptId) {
  return allEntries().some(
    (e) =>
      e.id !== exceptId &&
      e.interviewer?.id === interviewerId &&
      overlaps(start, end, e.startTime, e.endTime)
  );
}
function roomBusy(roomId, start, end, exceptId) {
  return allEntries().some(
    (e) =>
      e.id !== exceptId &&
      e.room?.id === roomId &&
      overlaps(start, end, e.startTime, e.endTime)
  );
}
function applicantBusy(applicationId, start, end, exceptId) {
  const app = applicationById(applicationId);
  if (!app) return false;
  return allEntries().some((e) => {
    if (e.id === exceptId) return false;
    const other = applicationById(e.applicationId);
    return (
      other?.applicantId === app.applicantId &&
      overlaps(start, end, e.startTime, e.endTime)
    );
  });
}
function recomputeSchedule(schedule) {
  if (schedule.status === 'CONFIRMED') {
    for (const entry of schedule.entries) entry.status = 'CONFIRMED';
  } else {
    for (const entry of schedule.entries) {
      entry.conflictWith = [];
      entry.conflictReason = null;
      if (!entry.startTime || !entry.endTime || !entry.interviewer || !entry.room) {
        entry.status = 'UNASSIGNED';
        if (!entry.reason) entry.reason = 'No interviewer, room or time slot is available.';
        continue;
      }
      entry.status = 'PROPOSED';
      entry.reason = null;
    }
    for (let i = 0; i < schedule.entries.length; i += 1) {
      for (let j = i + 1; j < schedule.entries.length; j += 1) {
        const a = schedule.entries[i];
        const b = schedule.entries[j];
        if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) continue;
        if (!overlaps(a.startTime, a.endTime, b.startTime, b.endTime)) continue;
        const appA = applicationById(a.applicationId);
        const appB = applicationById(b.applicationId);
        const reasons = [];
        if (appA && appB && appA.applicantId === appB.applicantId) {
          reasons.push(`Applicant ${appA.fullName}`);
        }
        if (a.interviewer?.id && a.interviewer.id === b.interviewer?.id) {
          reasons.push(`Interviewer ${a.interviewer.fullName}`);
        }
        if (a.room?.id && a.room.id === b.room?.id) {
          reasons.push(`Room ${a.room.name}`);
        }
        if (!reasons.length) continue;
        a.status = 'CONFLICT';
        b.status = 'CONFLICT';
        a.conflictWith.push(b.id);
        b.conflictWith.push(a.id);
        a.conflictReason = `${reasons.join(', ')} also has ${b.id} at the same time.`;
        b.conflictReason = `${reasons.join(', ')} also has ${a.id} at the same time.`;
      }
    }
  }
  schedule.summary = {
    total: schedule.entries.length,
    proposed: schedule.entries.filter((e) => e.status === 'PROPOSED').length,
    conflict: schedule.entries.filter((e) => e.status === 'CONFLICT').length,
    unassigned: schedule.entries.filter((e) => e.status === 'UNASSIGNED').length,
  };
  return schedule;
}

function slotTimes(schedule) {
  const [sh, sm] = schedule.startTime.split(':').map(Number);
  const [eh, em] = schedule.endTime.split(':').map(Number);
  const base = new Date(`${schedule.date}T00:00:00+07:00`);
  const start = new Date(base.getTime() + (sh * 60 + sm) * 60000);
  const end = new Date(base.getTime() + (eh * 60 + em) * 60000);
  const step = schedule.slotDuration * 60000;
  const slots = [];
  for (let t = start.getTime(); t + step <= end.getTime(); t += step) {
    slots.push([isoVN(new Date(t)), isoVN(new Date(t + step))]);
  }
  return slots;
}

function campaignValidation(body, partial = false) {
  const details = {};
  const required = ['name', 'clubName', 'applicationStartDate', 'applicationEndDate', 'interviewDate'];
  for (const key of required) {
    if (!partial && (body[key] === undefined || body[key] === null || body[key] === '')) {
      details[key] = 'This field is required';
    }
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.length > 150)) {
    details.name = 'Must be 1–150 characters';
  }
  if (body.clubName !== undefined && (typeof body.clubName !== 'string' || body.clubName.length > 120)) {
    details.clubName = 'Must be 1–120 characters';
  }
  if (body.applicationStartDate !== undefined && Number.isNaN(Date.parse(body.applicationStartDate))) {
    details.applicationStartDate = 'Must be an ISO 8601 date';
  }
  if (body.applicationEndDate !== undefined && Number.isNaN(Date.parse(body.applicationEndDate))) {
    details.applicationEndDate = 'Must be an ISO 8601 date';
  }
  if (body.interviewDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.interviewDate)) {
    details.interviewDate = 'Must be YYYY-MM-DD';
  }
  if (
    body.applicationStartDate &&
    body.applicationEndDate &&
    Date.parse(body.applicationEndDate) <= Date.parse(body.applicationStartDate)
  ) {
    details.applicationEndDate = 'Must be after applicationStartDate';
  }
  if (
    body.applicationEndDate &&
    body.interviewDate &&
    body.interviewDate <= body.applicationEndDate.slice(0, 10)
  ) {
    details.interviewDate = 'Must be after applicationEndDate';
  }
  if (!partial) {
    if (!Array.isArray(body.positions) || body.positions.length === 0) {
      details.positions = 'At least one position is required';
    } else {
      body.positions.forEach((position, index) => {
        if (!position || typeof position.name !== 'string' || !position.name) {
          details[`positions[${index}].name`] = 'This field is required';
        }
        if (!position || typeof position.department !== 'string' || !position.department) {
          details[`positions[${index}].department`] = 'This field is required';
        }
        if (!position || !Number.isInteger(position.quota) || position.quota < 1) {
          details[`positions[${index}].quota`] = 'Must be an integer from 1 to 100';
        }
      });
    }
  }
  return details;
}

// --------------------------------------------------------------------------
// Route handlers
async function handleLogin(req, res) {
  const body = await readJsonBody(req, res);
  if (!body) return;
  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      email: 'This field is required',
      password: 'This field is required',
    });
  }
  const user = Object.values(db.users).find(
    (u) => u.email.toLowerCase() === body.email.toLowerCase()
  );
  if (!user || user.password !== body.password) {
    return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  return ok(res, {
    accessToken: `token-${user.id}`,
    user: publicUser(user),
  }, { message: 'Login successful' });
}

function handleMe(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  return ok(res, publicUser(user));
}

function handleLogout(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  return ok(res, undefined, { message: 'Logout successful' });
}

function handleListCampaigns(req, res, url) {
  const status = url.searchParams.get('status');
  const search = (url.searchParams.get('search') || '').toLowerCase();
  let list = db.campaigns.filter((c) => ['OPEN', 'CONFIRMED'].includes(c.status));
  if (status) list = list.filter((c) => c.status === status);
  if (search) list = list.filter((c) => c.name.toLowerCase().includes(search));
  const { items, pagination } = paginate(list, url);
  return sendJson(res, 200, { success: true, data: items, pagination });
}

function handleGetCampaign(req, res, campaignId) {
  const campaign = campaignById(campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (campaign.status === 'DRAFT') {
    const user = authUser(req);
    if (!user || user.role !== 'EXECUTIVE') {
      return fail(res, 403, 'FORBIDDEN', 'You cannot access this campaign');
    }
  }
  return ok(res, campaign);
}

async function handleCreateCampaign(req, res) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const body = await readJsonBody(req, res);
  if (!body) return;
  const details = campaignValidation(body);
  if (Object.keys(details).length) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
  const id = `campaign_${pad(nextCampaign)}`;
  nextCampaign += 1;
  const campaign = {
    id,
    name: body.name,
    clubName: body.clubName,
    description: body.description || '',
    instructions: body.instructions || '',
    status: 'DRAFT',
    applicationStartDate: body.applicationStartDate,
    applicationEndDate: body.applicationEndDate,
    interviewDate: body.interviewDate,
    positions: [],
  };
  for (const position of body.positions) {
    const positionId = `position_${nextPosition}`;
    nextPosition += 1;
    campaign.positions.push({
      id: positionId,
      campaignId: id,
      name: position.name,
      department: position.department,
      quota: position.quota,
      description: position.description || '',
      requirements: position.requirements || '',
    });
  }
  db.campaigns.push(campaign);
  return created(res, campaign, 'Campaign created successfully');
}

async function handleUpdateCampaign(req, res, campaignId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const campaign = campaignById(campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (['CONFIRMED', 'COMPLETED'].includes(campaign.status)) {
    return fail(res, 409, 'CAMPAIGN_LOCKED', 'The campaign is read-only');
  }
  const body = await readJsonBody(req, res);
  if (!body) return;
  const details = campaignValidation(body, true);
  if (Object.keys(details).length) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
  for (const key of [
    'name',
    'clubName',
    'description',
    'instructions',
    'applicationStartDate',
    'applicationEndDate',
    'interviewDate',
  ]) {
    if (body[key] !== undefined) campaign[key] = body[key];
  }
  return ok(res, campaign, { message: 'Campaign updated successfully' });
}

function handleOpenCampaign(req, res, campaignId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const campaign = campaignById(campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (campaign.status !== 'DRAFT') {
    return fail(res, 409, 'INVALID_CAMPAIGN_STATUS', 'Only a draft campaign can be opened');
  }
  const details = campaignValidation(campaign);
  if (Object.keys(details).length) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
  if (db.campaigns.some((c) => c.id !== campaignId && c.status === 'OPEN')) {
    return fail(res, 409, 'ACTIVE_CAMPAIGN_EXISTS', 'Another campaign is already open');
  }
  campaign.status = 'OPEN';
  return ok(res, { id: campaign.id, status: campaign.status }, { message: 'Campaign opened successfully' });
}

function handleCloseCampaign(req, res, campaignId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const campaign = campaignById(campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (campaign.status !== 'OPEN') {
    return fail(res, 409, 'INVALID_CAMPAIGN_STATUS', 'Only an open campaign can be closed');
  }
  campaign.status = 'CLOSED';
  return ok(res, { id: campaign.id, status: campaign.status }, { message: 'Campaign closed successfully' });
}

async function handleConfirmCampaign(req, res, campaignId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const campaign = campaignById(campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (campaign.status === 'CONFIRMED') {
    return fail(res, 409, 'CAMPAIGN_ALREADY_CONFIRMED', 'The campaign is already confirmed');
  }
  const body = await readJsonBody(req, res);
  if (!body) return;
  if (body.confirm !== true) {
    return fail(res, 400, 'CONFIRMATION_NOT_ALLOWED', 'Send {"confirm": true} to confirm');
  }
  const apps = applicationsOf(campaignId);
  const schedule = scheduleFor(campaignId);
  const unreviewed = apps.filter((a) => a.status === 'PENDING').map(applicationCode);
  const conflicts = [];
  const unassigned = [];
  for (const app of apps.filter((a) => a.status === 'SHORTLISTED')) {
    const entry = schedule?.entries.find((e) => e.applicationId === app.id);
    if (!entry || entry.status === 'UNASSIGNED') unassigned.push(applicationCode(app));
    if (entry?.status === 'CONFLICT') conflicts.push(applicationCode(app));
  }
  if (schedule) {
    for (const entry of schedule.entries) {
      if (entry.status === 'CONFLICT' && !conflicts.includes(entry.applicationCode)) {
        conflicts.push(entry.applicationCode);
      }
    }
  }
  const campaignClosed = campaign.status === 'CLOSED';
  if (!campaignClosed || unreviewed.length || conflicts.length || unassigned.length) {
    return fail(res, 409, 'CONFIRMATION_NOT_ALLOWED', 'Campaign cannot be confirmed while blockers remain.', {
      campaignId,
      campaignClosed,
      unreviewedApplications: unreviewed,
      conflicts,
      unassigned,
    });
  }
  campaign.status = 'CONFIRMED';
  if (schedule) {
    schedule.status = 'CONFIRMED';
    recomputeSchedule(schedule);
  }
  return ok(res, { id: campaign.id, status: campaign.status, confirmedAt: now() }, {
    message: 'Campaign confirmed successfully',
  });
}

async function handleAddPosition(req, res, campaignId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const campaign = campaignById(campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (['CONFIRMED', 'COMPLETED'].includes(campaign.status)) {
    return fail(res, 409, 'CAMPAIGN_LOCKED', 'The campaign is read-only');
  }
  const body = await readJsonBody(req, res);
  if (!body) return;
  const details = {};
  if (typeof body.name !== 'string' || !body.name) details.name = 'This field is required';
  if (typeof body.department !== 'string' || !body.department) details.department = 'This field is required';
  if (!Number.isInteger(body.quota) || body.quota < 1 || body.quota > 100) {
    details.quota = 'Must be an integer from 1 to 100';
  }
  if (Object.keys(details).length) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
  const position = {
    id: `position_${nextPosition}`,
    campaignId,
    name: body.name,
    department: body.department,
    quota: body.quota,
    description: body.description || '',
    requirements: body.requirements || '',
  };
  nextPosition += 1;
  campaign.positions.push(position);
  return created(res, position, 'Position created successfully');
}

async function handleUpdatePosition(req, res, campaignId, positionId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const campaign = campaignById(campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (['CONFIRMED', 'COMPLETED'].includes(campaign.status)) {
    return fail(res, 409, 'CAMPAIGN_LOCKED', 'The campaign is read-only');
  }
  const position = positionOf(campaign, positionId);
  if (!position) return fail(res, 404, 'POSITION_NOT_FOUND', 'Position not found');
  const body = await readJsonBody(req, res);
  if (!body) return;
  if (body.quota !== undefined && (!Number.isInteger(body.quota) || body.quota < 1 || body.quota > 100)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      quota: 'Must be an integer from 1 to 100',
    });
  }
  for (const key of ['name', 'department', 'quota', 'description', 'requirements']) {
    if (body[key] !== undefined) position[key] = body[key];
  }
  return ok(res, position, { message: 'Position updated successfully' });
}

function handleDeletePosition(req, res, campaignId, positionId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const campaign = campaignById(campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (['CONFIRMED', 'COMPLETED'].includes(campaign.status)) {
    return fail(res, 409, 'CAMPAIGN_LOCKED', 'The campaign is read-only');
  }
  const index = campaign.positions.findIndex((p) => p.id === positionId);
  if (index === -1) return fail(res, 404, 'POSITION_NOT_FOUND', 'Position not found');
  if (db.applications.some((a) => a.positionId === positionId)) {
    return fail(res, 409, 'POSITION_HAS_APPLICATIONS', 'The position has applications');
  }
  campaign.positions.splice(index, 1);
  return ok(res, undefined, { message: 'Position deleted successfully' });
}

function handleSlots(req, res, campaignId) {
  const campaign = campaignById(campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  return ok(res, db.slots.filter((s) => s.campaignId === campaignId));
}

async function handleSubmitApplication(req, res) {
  const user = requireRole(req, res, ['APPLICANT']);
  if (!user) return;
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Use multipart/form-data');
  }
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return fail(res, 400, 'VALIDATION_ERROR', 'Missing multipart boundary');
  const raw = await readBody(req);
  const fields = parseMultipart(raw, boundaryMatch[1] || boundaryMatch[2]);
  const required = ['campaignId', 'positionId', 'studentId', 'fullName', 'email', 'phone', 'cv', 'motivationStatement', 'availabilitySlotIds'];
  const details = {};
  for (const key of required) {
    if (!fields[key]) details[key] = 'This field is required';
  }
  if (Object.keys(details).length) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
  const campaign = campaignById(fields.campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  const position = positionOf(campaign, fields.positionId);
  if (!position) return fail(res, 404, 'POSITION_NOT_FOUND', 'Position not found');
  if (campaign.status !== 'OPEN') {
    return fail(res, 409, 'CAMPAIGN_CLOSED', 'The campaign is not accepting applications');
  }
  const cv = fields.cv;
  if (!cv || !/\.pdf$/i.test(cv.filename || '')) {
    return fail(res, 400, 'INVALID_CV_FORMAT', 'CV must be a PDF file');
  }
  if (!cv.data.subarray(0, 4).toString('latin1').startsWith('%PDF')) {
    return fail(res, 400, 'INVALID_CV_FORMAT', 'CV must be a PDF file');
  }
  if (cv.data.length > 5 * 1024 * 1024) {
    return fail(res, 400, 'CV_TOO_LARGE', 'CV must not exceed 5 MB');
  }
  const words = fields.motivationStatement.trim().split(/\s+/).filter(Boolean);
  if (words.length > 300) {
    return fail(res, 400, 'MOTIVATION_TOO_LONG', 'Motivation statement must not exceed 300 words');
  }
  const existing = db.applications.find(
    (a) => a.campaignId === fields.campaignId && a.positionId === fields.positionId && a.applicantId === user.id
  );
  if (existing) {
    return sendJson(res, 409, {
      success: false,
      message: 'You have already applied for this position',
      error: { code: 'APPLICATION_ALREADY_EXISTS', existingApplicationId: existing.id },
    });
  }
  const app = {
    id: `application_${pad(nextApplication)}`,
    campaignId: fields.campaignId,
    positionId: fields.positionId,
    applicantId: user.id,
    studentId: fields.studentId,
    fullName: fields.fullName,
    email: fields.email,
    phone: fields.phone,
    cvFileName: cv.filename,
    cvSizeBytes: cv.data.length,
    motivationStatement: fields.motivationStatement,
    status: 'PENDING',
    submittedAt: now(),
    internalNotes: '',
  };
  nextApplication += 1;
  db.applications.push(app);
  return created(res, {
    id: app.id,
    campaignId: app.campaignId,
    positionId: app.positionId,
    applicantId: app.applicantId,
    status: app.status,
    submittedAt: app.submittedAt,
  }, 'Application submitted successfully');
}

function handleMyApplications(req, res, url) {
  const user = requireRole(req, res, ['APPLICANT']);
  if (!user) return;
  let list = db.applications.filter((a) => a.applicantId === user.id);
  const status = url.searchParams.get('status');
  if (status) list = list.filter((a) => a.status === status);
  list = [...list].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const { items, pagination } = paginate(list, url);
  return sendJson(res, 200, {
    success: true,
    data: items.map(applicationSummary),
    pagination,
  });
}

function canReadApplication(user, app) {
  if (!user) return false;
  if (user.role === 'EXECUTIVE') return true;
  if (user.role === 'APPLICANT') return app.applicantId === user.id;
  if (user.role === 'INTERVIEWER') {
    return allEntries().some(
      (entry) => entry.applicationId === app.id && entry.interviewer?.id === user.id
    );
  }
  return false;
}

function handleGetApplication(req, res, applicationId) {
  const user = requireUser(req, res);
  if (!user) return;
  const app = applicationById(applicationId);
  if (!app) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found');
  if (!canReadApplication(user, app)) {
    return fail(res, 403, 'FORBIDDEN', 'You cannot access this application');
  }
  return ok(res, applicationDetails(app, user.role === 'EXECUTIVE'));
}

function handleListApplications(req, res, url) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  let list = [...db.applications];
  const campaignId = url.searchParams.get('campaignId');
  const positionId = url.searchParams.get('positionId');
  const status = url.searchParams.get('status');
  const search = (url.searchParams.get('search') || '').toLowerCase();
  if (campaignId) list = list.filter((a) => a.campaignId === campaignId);
  if (positionId) list = list.filter((a) => a.positionId === positionId);
  if (status) list = list.filter((a) => a.status === status);
  if (search) {
    list = list.filter((a) =>
      [a.fullName, a.email, a.studentId].some((value) => String(value).toLowerCase().includes(search))
    );
  }
  const sortBy = url.searchParams.get('sortBy') || 'submittedAt';
  const order = url.searchParams.get('order') || 'desc';
  list.sort((a, b) => {
    const left = String(a[sortBy] ?? '');
    const right = String(b[sortBy] ?? '');
    return order === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
  });
  const { items, pagination } = paginate(list, url);
  return sendJson(res, 200, {
    success: true,
    data: items.map((a) => ({
      id: a.id,
      applicantId: a.applicantId,
      studentId: a.studentId,
      fullName: a.fullName,
      email: a.email,
      positionId: a.positionId,
      positionName: positionName(a.campaignId, a.positionId),
      status: a.status,
      submittedAt: a.submittedAt,
    })),
    pagination,
  });
}

async function handleScreening(req, res, applicationId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const app = applicationById(applicationId);
  if (!app) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found');
  const campaign = campaignById(app.campaignId);
  if (campaign && ['CONFIRMED', 'COMPLETED'].includes(campaign.status)) {
    return fail(res, 409, 'APPLICATION_LOCKED', 'Applications are read-only');
  }
  const body = await readJsonBody(req, res);
  if (!body) return;
  if (!['SHORTLISTED', 'REJECTED'].includes(body.status)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      status: 'Must be SHORTLISTED or REJECTED',
    });
  }
  app.status = body.status;
  if (body.internalNotes !== undefined) app.internalNotes = body.internalNotes;
  app.reviewedAt = now();
  return ok(res, {
    id: app.id,
    status: app.status,
    internalNotes: app.internalNotes || '',
    reviewedAt: app.reviewedAt,
  }, { message: 'Application screening updated successfully' });
}

function handleStatistics(req, res, url) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const campaignId = url.searchParams.get('campaignId');
  if (!campaignId) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      campaignId: 'This field is required',
    });
  }
  if (!campaignById(campaignId)) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  const apps = applicationsOf(campaignId);
  return ok(res, {
    campaignId,
    totalApplications: apps.length,
    pending: apps.filter((a) => a.status === 'PENDING').length,
    shortlisted: apps.filter((a) => a.status === 'SHORTLISTED').length,
    rejected: apps.filter((a) => a.status === 'REJECTED').length,
  });
}

function handleExportApplications(req, res, url) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const campaignId = url.searchParams.get('campaignId');
  if (!campaignId) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      campaignId: 'This field is required',
    });
  }
  if (!campaignById(campaignId)) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  const status = url.searchParams.get('status');
  const apps = applicationsOf(campaignId).filter((a) => !status || a.status === status);
  const lines = ['id,studentId,fullName,email,position,status,submittedAt'];
  for (const a of apps) {
    lines.push(
      [a.id, a.studentId, a.fullName, a.email, positionName(a.campaignId, a.positionId), a.status, a.submittedAt]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    );
  }
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="applications.csv"',
  });
  res.end(`${lines.join('\n')}\n`);
}

function handleCv(req, res, applicationId) {
  const user = requireUser(req, res);
  if (!user) return;
  const app = applicationById(applicationId);
  if (!app) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found');
  if (!canReadApplication(user, app)) {
    return fail(res, 403, 'FORBIDDEN', 'You cannot access this application');
  }
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${app.cvFileName || 'cv.pdf'}"`,
  });
  res.end(`%PDF-1.4\n% ClubFlow mock CV for ${app.id}\n%%EOF\n`);
}

function handleListInterviewers(req, res, url) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const search = (url.searchParams.get('search') || '').toLowerCase();
  const positionId = url.searchParams.get('positionId');
  let list = Object.values(db.interviewers);
  if (search) {
    list = list.filter((i) =>
      [i.fullName, i.email].some((value) => value.toLowerCase().includes(search))
    );
  }
  if (positionId) list = list.filter((i) => i.assignedPositionIds.includes(positionId));
  const { items, pagination } = paginate(list, url);
  return sendJson(res, 200, {
    success: true,
    data: items.map((i) => ({
      id: i.id,
      fullName: i.fullName,
      email: i.email,
      role: i.role,
      assignedPositionIds: i.assignedPositionIds,
    })),
    pagination,
  });
}

function handleGetInterviewer(req, res, interviewerId) {
  const user = requireUser(req, res);
  if (!user) return;
  const interviewer = db.interviewers[interviewerId];
  if (!interviewer) return fail(res, 404, 'INTERVIEWER_NOT_FOUND', 'Interviewer not found');
  if (user.role !== 'EXECUTIVE' && user.id !== interviewerId) {
    return fail(res, 403, 'FORBIDDEN', 'You cannot access this interviewer');
  }
  return ok(res, {
    id: interviewer.id,
    fullName: interviewer.fullName,
    email: interviewer.email,
    role: interviewer.role,
    assignedPositionIds: interviewer.assignedPositionIds,
  });
}

async function handlePutPositions(req, res, interviewerId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const interviewer = db.interviewers[interviewerId];
  if (!interviewer) return fail(res, 404, 'INTERVIEWER_NOT_FOUND', 'Interviewer not found');
  if (interviewer.role !== 'INTERVIEWER') {
    return fail(res, 409, 'INVALID_INTERVIEWER_ROLE', 'The account is not an interviewer');
  }
  const body = await readJsonBody(req, res);
  if (!body) return;
  if (typeof body.campaignId !== 'string' || !Array.isArray(body.positionIds)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      campaignId: 'This field is required',
      positionIds: 'Must be an array of position ids',
    });
  }
  const campaign = campaignById(body.campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (campaign.status === 'CONFIRMED') {
    return fail(res, 409, 'ASSIGNMENT_LOCKED', 'The campaign is confirmed');
  }
  const invalid = body.positionIds.filter((id) => !positionOf(campaign, id));
  if (invalid.length) {
    return fail(res, 404, 'POSITION_NOT_FOUND', 'One or more positions do not exist');
  }
  const otherCampaignPositions = interviewer.assignedPositionIds.filter((id) => {
    const positionCampaign = db.campaigns.find((c) => c.positions.some((p) => p.id === id));
    return positionCampaign && positionCampaign.id !== body.campaignId;
  });
  interviewer.assignedPositionIds = [...new Set([...otherCampaignPositions, ...body.positionIds])];
  return ok(res, {
    interviewerId: interviewer.id,
    assignedPositionIds: interviewer.assignedPositionIds,
  }, { message: 'Interviewer positions updated successfully' });
}

function handleGetAvailability(req, res, interviewerId, url) {
  const user = requireUser(req, res);
  if (!user) return;
  const interviewer = db.interviewers[interviewerId];
  if (!interviewer) return fail(res, 404, 'INTERVIEWER_NOT_FOUND', 'Interviewer not found');
  if (user.role !== 'EXECUTIVE' && user.id !== interviewerId) {
    return fail(res, 403, 'FORBIDDEN', 'You cannot access this interviewer');
  }
  const campaignId = url.searchParams.get('campaignId');
  if (!campaignId) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      campaignId: 'This field is required',
    });
  }
  return ok(res, interviewer.availability.filter((slot) => slot.campaignId === campaignId));
}

async function handlePutAvailability(req, res, interviewerId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const interviewer = db.interviewers[interviewerId];
  if (!interviewer) return fail(res, 404, 'INTERVIEWER_NOT_FOUND', 'Interviewer not found');
  const body = await readJsonBody(req, res);
  if (!body) return;
  const campaign = campaignById(body.campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  if (campaign.status === 'CONFIRMED') {
    return fail(res, 409, 'SCHEDULE_ALREADY_CONFIRMED', 'Availability is read-only');
  }
  if (!Array.isArray(body.slots)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      slots: 'Must be an array',
    });
  }
  for (const slot of body.slots) {
    if (!slot.startTime || !slot.endTime || Date.parse(slot.endTime) <= Date.parse(slot.startTime)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
        slots: 'Each slot needs startTime before endTime',
      });
    }
    if (!slot.startTime.startsWith(campaign.interviewDate)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
        slots: 'Slots must be on the campaign interview date',
      });
    }
  }
  for (let i = 0; i < body.slots.length; i += 1) {
    for (let j = i + 1; j < body.slots.length; j += 1) {
      if (overlaps(body.slots[i].startTime, body.slots[i].endTime, body.slots[j].startTime, body.slots[j].endTime)) {
        return fail(res, 409, 'AVAILABILITY_CONFLICT', 'Availability slots overlap');
      }
    }
  }
  const previous = interviewer.availability.filter((slot) => slot.campaignId === body.campaignId);
  const kept = interviewer.availability.filter((slot) => slot.campaignId !== body.campaignId);
  const replacement = body.slots.map((slot, index) => ({
    id: previous[index]?.id || `availability_${interviewerId}_${body.campaignId}_${index + 1}`,
    interviewerId,
    campaignId: body.campaignId,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isAvailable: true,
  }));
  interviewer.availability = [...kept, ...replacement];
  return ok(res, {
    interviewerId,
    campaignId: body.campaignId,
    slots: replacement.map(({ id, startTime, endTime }) => ({ id, startTime, endTime })),
  }, { message: 'Interviewer availability updated successfully' });
}

function handleMyAssignments(req, res) {
  const user = requireRole(req, res, ['INTERVIEWER']);
  if (!user) return;
  const interviewer = db.interviewers[user.id];
  if (!interviewer) return fail(res, 404, 'INTERVIEWER_NOT_FOUND', 'Interviewer not found');
  const data = [];
  for (const campaign of db.campaigns) {
    const positions = campaign.positions.filter((p) => interviewer.assignedPositionIds.includes(p.id));
    if (positions.length) {
      data.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        positions: positions.map((p) => ({ id: p.id, name: p.name, department: p.department })),
      });
    }
  }
  return ok(res, data);
}

function handleMyInterviews(req, res, url) {
  const user = requireRole(req, res, ['INTERVIEWER']);
  if (!user) return;
  const campaignFilter = url.searchParams.get('campaignId');
  const dateFilter = url.searchParams.get('date');
  const items = allEntries().filter((entry) => {
    if (entry.interviewer?.id !== user.id) return false;
    if (entry.status !== 'CONFIRMED') return false;
    if (campaignFilter) {
      const schedule = Object.values(db.schedule).find((s) => s.entries.includes(entry));
      if (schedule?.campaignId !== campaignFilter) return false;
    }
    if (dateFilter && !entry.startTime?.startsWith(dateFilter)) return false;
    return true;
  });
  const { items: pageItems, pagination } = paginate(items, url);
  return sendJson(res, 200, {
    success: true,
    data: pageItems.map((entry) => {
      const schedule = Object.values(db.schedule).find((s) => s.entries.includes(entry));
      return {
        id: entry.id,
        applicationId: entry.applicationId,
        campaignId: schedule?.campaignId,
        positionName: entry.positionName,
        applicant: {
          fullName: entry.applicantName,
          studentId: applicationById(entry.applicationId)?.studentId || '',
        },
        startTime: entry.startTime,
        endTime: entry.endTime,
        room: entry.room,
        status: entry.status,
      };
    }),
    pagination,
  });
}

function handleRooms(req, res) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  return ok(res, db.rooms);
}

function handleGetSchedule(req, res, campaignId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  if (!campaignById(campaignId)) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  const schedule = scheduleFor(campaignId);
  if (!schedule) return fail(res, 404, 'SCHEDULE_NOT_FOUND', 'No schedule has been generated');
  return ok(res, schedule);
}

async function handleGenerateSchedule(req, res, campaignId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const campaign = campaignById(campaignId);
  if (!campaign) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  const current = scheduleFor(campaignId);
  if (current?.status === 'CONFIRMED') {
    return fail(res, 409, 'SCHEDULE_ALREADY_CONFIRMED', 'The schedule is confirmed');
  }
  const body = await readJsonBody(req, res);
  if (!body) return;
  const details = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) details.date = 'Must be YYYY-MM-DD';
  if (!/^\d{2}:\d{2}$/.test(body.startTime || '')) details.startTime = 'Must be HH:mm';
  if (!/^\d{2}:\d{2}$/.test(body.endTime || '')) details.endTime = 'Must be HH:mm';
  if (![15, 20, 30].includes(body.slotDuration)) details.slotDuration = 'Must be 15, 20 or 30';
  if (Object.keys(details).length) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
  if (body.date !== campaign.interviewDate) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      date: 'Must be the campaign interview date',
    });
  }
  const seed = SEED_SCHEDULE[campaignId];
  if (seed) {
    db.schedule[campaignId] = structuredClone(seed);
  } else {
    const apps = applicationsOf(campaignId).filter((a) => a.status === 'SHORTLISTED');
    db.schedule[campaignId] = {
      campaignId,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      slotDuration: body.slotDuration,
      status: 'DRAFT',
      entries: apps.map((app, index) => ({
        id: `interview_${pad(nextInterview + index)}`,
        applicationId: app.id,
        applicationCode: applicationCode(app),
        applicantName: app.fullName,
        positionId: app.positionId,
        positionName: positionName(app.campaignId, app.positionId),
        interviewer: null,
        room: null,
        startTime: null,
        endTime: null,
        status: 'UNASSIGNED',
        reason: 'No qualified interviewer is available.',
        conflictWith: [],
        conflictReason: null,
      })),
      summary: { total: apps.length, proposed: 0, conflict: 0, unassigned: apps.length },
    };
    nextInterview += apps.length;
  }
  db.schedule[campaignId].date = body.date;
  db.schedule[campaignId].startTime = body.startTime;
  db.schedule[campaignId].endTime = body.endTime;
  db.schedule[campaignId].slotDuration = body.slotDuration;
  return ok(res, db.schedule[campaignId], { message: 'Draft schedule generated' });
}

async function handlePatchEntry(req, res, entryId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const found = findEntry(entryId);
  if (!found) return fail(res, 404, 'ENTRY_NOT_FOUND', 'Schedule entry not found');
  const { schedule, entry } = found;
  if (schedule.status === 'CONFIRMED') {
    return fail(res, 409, 'SCHEDULE_ALREADY_CONFIRMED', 'The schedule is read-only');
  }
  const body = await readJsonBody(req, res);
  if (!body) return;
  const start = body.startTime ?? entry.startTime;
  const end = body.endTime ?? entry.endTime;
  if (!start || !end || Date.parse(end) <= Date.parse(start)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      endTime: 'Must be after startTime',
    });
  }
  if (!start.startsWith(schedule.date)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      startTime: 'Must be on the campaign interview date',
    });
  }
  if (body.interviewerId) {
    const interviewer = db.interviewers[body.interviewerId];
    if (!interviewer) return fail(res, 404, 'INTERVIEWER_NOT_FOUND', 'Interviewer not found');
    if (!interviewer.assignedPositionIds.includes(entry.positionId)) {
      return fail(res, 409, 'INTERVIEWER_NOT_QUALIFIED', 'The interviewer is not assigned to this position');
    }
    entry.interviewer = { id: interviewer.id, fullName: interviewer.fullName };
  }
  if (body.roomId) {
    const room = db.rooms.find((r) => r.id === body.roomId);
    if (!room) return fail(res, 404, 'ROOM_NOT_FOUND', 'Room not found');
    entry.room = { id: room.id, name: room.name };
  }
  if (body.startTime) entry.startTime = body.startTime;
  if (body.endTime) entry.endTime = body.endTime;
  recomputeSchedule(schedule);
  return ok(res, entry, { message: 'Schedule entry updated' });
}

function handleResolveEntry(req, res, entryId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const found = findEntry(entryId);
  if (!found) return fail(res, 404, 'ENTRY_NOT_FOUND', 'Schedule entry not found');
  const { schedule, entry } = found;
  if (schedule.status === 'CONFIRMED') {
    return fail(res, 409, 'SCHEDULE_ALREADY_CONFIRMED', 'The schedule is read-only');
  }
  const interviewerId = entry.interviewer?.id;
  const roomId = entry.room?.id;
  if (!interviewerId || !roomId) {
    return fail(res, 409, 'NO_AVAILABLE_SLOT', 'No interviewer or room is assigned');
  }
  const candidates = slotTimes(schedule);
  for (const [start, end] of candidates) {
    if (
      !applicantBusy(entry.applicationId, start, end, entry.id) &&
      !interviewerBusy(interviewerId, start, end, entry.id) &&
      !roomBusy(roomId, start, end, entry.id)
    ) {
      entry.startTime = start;
      entry.endTime = end;
      entry.reason = null;
      recomputeSchedule(schedule);
      return ok(res, entry, { message: 'Conflict resolved' });
    }
  }
  return fail(res, 409, 'NO_AVAILABLE_SLOT', 'No valid slot remains');
}

async function handleAssignEntry(req, res, campaignId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const schedule = scheduleFor(campaignId);
  if (!schedule) return fail(res, 404, 'SCHEDULE_NOT_FOUND', 'No schedule has been generated');
  if (schedule.status === 'CONFIRMED') {
    return fail(res, 409, 'SCHEDULE_ALREADY_CONFIRMED', 'The schedule is read-only');
  }
  const body = await readJsonBody(req, res);
  if (!body) return;
  const app = applicationById(body.applicationId);
  if (!app) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found');
  if (app.status !== 'SHORTLISTED') {
    return fail(res, 409, 'APPLICATION_NOT_SHORTLISTED', 'The application is not shortlisted');
  }
  const interviewer = db.interviewers[body.interviewerId];
  if (!interviewer) return fail(res, 404, 'INTERVIEWER_NOT_FOUND', 'Interviewer not found');
  if (!interviewer.assignedPositionIds.includes(app.positionId)) {
    return fail(res, 409, 'INTERVIEWER_NOT_QUALIFIED', 'The interviewer is not assigned to this position');
  }
  const room = db.rooms.find((r) => r.id === body.roomId);
  if (!room) return fail(res, 404, 'ROOM_NOT_FOUND', 'Room not found');
  if (!body.startTime || !body.endTime || Date.parse(body.endTime) <= Date.parse(body.startTime)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      endTime: 'Must be after startTime',
    });
  }
  if (
    applicantBusy(app.id, body.startTime, body.endTime) ||
    interviewerBusy(interviewer.id, body.startTime, body.endTime) ||
    roomBusy(room.id, body.startTime, body.endTime)
  ) {
    return fail(res, 409, 'SCHEDULE_CONFLICT', 'The slot overlaps another assignment');
  }
  let entry = schedule.entries.find((e) => e.applicationId === app.id);
  if (!entry) {
    entry = {
      id: `interview_${pad(nextInterview)}`,
      applicationId: app.id,
      applicationCode: applicationCode(app),
      applicantName: app.fullName,
      positionId: app.positionId,
      positionName: positionName(app.campaignId, app.positionId),
      interviewer: null,
      room: null,
      startTime: null,
      endTime: null,
      status: 'UNASSIGNED',
      reason: null,
      conflictWith: [],
      conflictReason: null,
    };
    nextInterview += 1;
    schedule.entries.push(entry);
  }
  entry.interviewer = { id: interviewer.id, fullName: interviewer.fullName };
  entry.room = { id: room.id, name: room.name };
  entry.startTime = body.startTime;
  entry.endTime = body.endTime;
  entry.reason = null;
  recomputeSchedule(schedule);
  return created(res, entry, 'Slot assigned');
}

async function handleSaveSchedule(req, res, campaignId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  if (!campaignById(campaignId)) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  const schedule = scheduleFor(campaignId);
  if (!schedule) return fail(res, 404, 'SCHEDULE_NOT_FOUND', 'No schedule has been generated');
  if (schedule.status === 'CONFIRMED') {
    return fail(res, 409, 'SCHEDULE_ALREADY_CONFIRMED', 'The schedule is read-only');
  }
  await readJsonBody(req, res);
  return ok(res, { campaignId, status: schedule.status, savedAt: now() }, {
    message: 'Schedule saved',
  });
}

function handleExportSchedule(req, res, campaignId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  if (!campaignById(campaignId)) return fail(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
  const schedule = scheduleFor(campaignId);
  if (!schedule) return fail(res, 404, 'SCHEDULE_NOT_FOUND', 'No schedule has been generated');
  const lines = ['code,applicant,position,start,end,interviewer,room,status'];
  for (const entry of schedule.entries) {
    lines.push(
      [
        entry.applicationCode,
        entry.applicantName,
        entry.positionName,
        entry.startTime || '',
        entry.endTime || '',
        entry.interviewer?.fullName || '',
        entry.room?.name || '',
        entry.status,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    );
  }
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="interview-schedule.csv"',
  });
  res.end(`${lines.join('\n')}\n`);
}

function handleGetAssessment(req, res, interviewId) {
  const user = requireUser(req, res);
  if (!user) return;
  const found = findEntry(interviewId);
  if (!found) return fail(res, 404, 'INTERVIEW_NOT_FOUND', 'Interview not found');
  const { entry } = found;
  if (user.role !== 'EXECUTIVE' && entry.interviewer?.id !== user.id) {
    return fail(res, 403, 'FORBIDDEN', 'You are not assigned to this interview');
  }
  const assessment = db.assessments.find((a) => a.interviewId === interviewId);
  if (!assessment) {
    return fail(res, 404, 'ASSESSMENT_NOT_FOUND', 'No assessment exists for this interview');
  }
  return ok(res, assessment);
}

async function handlePutAssessment(req, res, interviewId) {
  const user = requireUser(req, res);
  if (!user) return;
  if (user.role !== 'INTERVIEWER') {
    return fail(res, 403, 'FORBIDDEN', 'Only the assigned interviewer can submit an assessment');
  }
  const found = findEntry(interviewId);
  if (!found) return fail(res, 404, 'INTERVIEW_NOT_FOUND', 'Interview not found');
  const { schedule, entry } = found;
  if (entry.interviewer?.id !== user.id) {
    return fail(res, 403, 'FORBIDDEN', 'You are not assigned to this interview');
  }
  if (schedule.status !== 'CONFIRMED') {
    return fail(res, 409, 'ASSESSMENT_NOT_ALLOWED', 'The interview is not confirmed yet');
  }
  const body = await readJsonBody(req, res);
  if (!body) return;
  const details = {};
  if (!Number.isInteger(body.score) || body.score < 1 || body.score > 5) {
    details.score = 'Must be an integer from 1 to 5';
  }
  if (!['PASS', 'FAIL'].includes(body.recommendation)) {
    details.recommendation = 'Must be PASS or FAIL';
  }
  if (body.comments !== undefined && String(body.comments).length > 1000) {
    details.comments = 'Must be at most 1000 characters';
  }
  if (Object.keys(details).length) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
  let assessment = db.assessments.find((a) => a.interviewId === interviewId);
  if (assessment) {
    assessment.score = body.score;
    assessment.recommendation = body.recommendation;
    assessment.comments = body.comments || '';
    assessment.submittedAt = now();
  } else {
    assessment = {
      id: `assessment_${pad(nextAssessment)}`,
      interviewId,
      applicationId: entry.applicationId,
      interviewerId: user.id,
      score: body.score,
      recommendation: body.recommendation,
      comments: body.comments || '',
      submittedAt: now(),
    };
    nextAssessment += 1;
    db.assessments.push(assessment);
  }
  return ok(res, assessment, { message: 'Assessment saved' });
}

function resultFor(applicationId) {
  return (
    db.results[applicationId] || {
      applicationId,
      status: 'PENDING',
      published: false,
      decidedAt: null,
      publishedAt: null,
    }
  );
}

function handleGetResult(req, res, applicationId) {
  const user = requireUser(req, res);
  if (!user) return;
  const app = applicationById(applicationId);
  if (!app) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found');
  if (user.role === 'APPLICANT' && app.applicantId !== user.id) {
    return fail(res, 403, 'FORBIDDEN', 'You cannot access this result');
  }
  if (user.role === 'INTERVIEWER') {
    return fail(res, 403, 'FORBIDDEN', 'You cannot access final results');
  }
  return ok(res, resultFor(applicationId));
}

async function handlePutResult(req, res, applicationId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const app = applicationById(applicationId);
  if (!app) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found');
  const current = db.results[applicationId];
  if (current?.published) {
    return fail(res, 409, 'RESULT_LOCKED', 'The result is already published');
  }
  const body = await readJsonBody(req, res);
  if (!body) return;
  if (!['PASS', 'FAIL'].includes(body.status)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      status: 'Must be PASS or FAIL',
    });
  }
  const result = {
    applicationId,
    status: body.status,
    published: false,
    decidedAt: now(),
    publishedAt: null,
  };
  db.results[applicationId] = result;
  return ok(res, result, { message: 'Final result recorded' });
}

function handlePublishResult(req, res, applicationId) {
  const user = requireRole(req, res, ['EXECUTIVE']);
  if (!user) return;
  const app = applicationById(applicationId);
  if (!app) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found');
  const result = db.results[applicationId];
  if (!result || result.status === 'PENDING') {
    return fail(res, 409, 'RESULT_NOT_RECORDED', 'No final result has been recorded');
  }
  if (result.published) {
    return fail(res, 409, 'RESULT_ALREADY_PUBLISHED', 'The result is already published');
  }
  result.published = true;
  result.publishedAt = now();
  const notification = {
    id: `notification_${pad(nextNotification)}`,
    type: 'RESULT_PUBLISHED',
    title: 'Kết quả tuyển thành viên',
    message: `Đơn ${applicationCode(app)} của bạn đã có kết quả: ${result.status}.`,
    applicationId,
    createdAt: result.publishedAt,
    read: false,
    applicantId: app.applicantId,
  };
  nextNotification += 1;
  db.notifications.push(notification);
  return ok(res, result, { message: 'Result published' });
}

function handleListNotifications(req, res) {
  const user = requireRole(req, res, ['APPLICANT']);
  if (!user) return;
  return ok(
    res,
    db.notifications.filter((n) => n.applicantId === user.id).map(publicNotification)
  );
}

async function handlePatchNotification(req, res, notificationId) {
  const user = requireRole(req, res, ['APPLICANT']);
  if (!user) return;
  const notification = db.notifications.find((n) => n.id === notificationId);
  if (!notification) return fail(res, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  if (notification.applicantId !== user.id) {
    return fail(res, 403, 'FORBIDDEN', 'This notification belongs to another applicant');
  }
  const body = await readJsonBody(req, res);
  if (!body) return;
  if (typeof body.read !== 'boolean') {
    return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      read: 'Must be a boolean',
    });
  }
  notification.read = body.read;
  return ok(res, publicNotification(notification), { message: 'Notification updated' });
}

// --------------------------------------------------------------------------
// Router
const routes = [
  ['POST', /^\/api\/auth\/login\/?$/, (req, res) => handleLogin(req, res)],
  ['GET', /^\/api\/auth\/me\/?$/, (req, res) => handleMe(req, res)],
  ['POST', /^\/api\/auth\/logout\/?$/, (req, res) => handleLogout(req, res)],

  ['GET', /^\/api\/campaigns\/?$/, (req, res, m, url) => handleListCampaigns(req, res, url)],
  ['POST', /^\/api\/campaigns\/?$/, (req, res) => handleCreateCampaign(req, res)],
  ['GET', /^\/api\/campaigns\/([^/]+)\/slots\/?$/, (req, res, m) => handleSlots(req, res, decodeURIComponent(m[1]))],
  ['GET', /^\/api\/campaigns\/([^/]+)\/schedule\/export\/?$/, (req, res, m) => handleExportSchedule(req, res, decodeURIComponent(m[1]))],
  ['GET', /^\/api\/campaigns\/([^/]+)\/schedule\/?$/, (req, res, m) => handleGetSchedule(req, res, decodeURIComponent(m[1]))],
  ['POST', /^\/api\/campaigns\/([^/]+)\/schedule\/generate\/?$/, (req, res, m) => handleGenerateSchedule(req, res, decodeURIComponent(m[1]))],
  ['POST', /^\/api\/campaigns\/([^/]+)\/schedule\/entries\/?$/, (req, res, m) => handleAssignEntry(req, res, decodeURIComponent(m[1]))],
  ['PUT', /^\/api\/campaigns\/([^/]+)\/schedule\/?$/, (req, res, m) => handleSaveSchedule(req, res, decodeURIComponent(m[1]))],
  ['POST', /^\/api\/campaigns\/([^/]+)\/open\/?$/, (req, res, m) => handleOpenCampaign(req, res, decodeURIComponent(m[1]))],
  ['POST', /^\/api\/campaigns\/([^/]+)\/close\/?$/, (req, res, m) => handleCloseCampaign(req, res, decodeURIComponent(m[1]))],
  ['POST', /^\/api\/campaigns\/([^/]+)\/confirm\/?$/, (req, res, m) => handleConfirmCampaign(req, res, decodeURIComponent(m[1]))],
  ['POST', /^\/api\/campaigns\/([^/]+)\/positions\/?$/, (req, res, m) => handleAddPosition(req, res, decodeURIComponent(m[1]))],
  ['PATCH', /^\/api\/campaigns\/([^/]+)\/positions\/([^/]+)\/?$/, (req, res, m) => handleUpdatePosition(req, res, decodeURIComponent(m[1]), decodeURIComponent(m[2]))],
  ['DELETE', /^\/api\/campaigns\/([^/]+)\/positions\/([^/]+)\/?$/, (req, res, m) => handleDeletePosition(req, res, decodeURIComponent(m[1]), decodeURIComponent(m[2]))],
  ['PATCH', /^\/api\/campaigns\/([^/]+)\/?$/, (req, res, m) => handleUpdateCampaign(req, res, decodeURIComponent(m[1]))],
  ['GET', /^\/api\/campaigns\/([^/]+)\/?$/, (req, res, m) => handleGetCampaign(req, res, decodeURIComponent(m[1]))],

  ['POST', /^\/api\/applications\/?$/, (req, res) => handleSubmitApplication(req, res)],
  ['GET', /^\/api\/applications\/me\/?$/, (req, res, m, url) => handleMyApplications(req, res, url)],
  ['GET', /^\/api\/applications\/statistics\/?$/, (req, res, m, url) => handleStatistics(req, res, url)],
  ['GET', /^\/api\/applications\/export\/?$/, (req, res, m, url) => handleExportApplications(req, res, url)],
  ['GET', /^\/api\/applications\/([^/]+)\/cv\/?$/, (req, res, m) => handleCv(req, res, decodeURIComponent(m[1]))],
  ['GET', /^\/api\/applications\/([^/]+)\/result\/?$/, (req, res, m) => handleGetResult(req, res, decodeURIComponent(m[1]))],
  ['PUT', /^\/api\/applications\/([^/]+)\/result\/?$/, (req, res, m) => handlePutResult(req, res, decodeURIComponent(m[1]))],
  ['POST', /^\/api\/applications\/([^/]+)\/result\/publish\/?$/, (req, res, m) => handlePublishResult(req, res, decodeURIComponent(m[1]))],
  ['PATCH', /^\/api\/applications\/([^/]+)\/screening\/?$/, (req, res, m) => handleScreening(req, res, decodeURIComponent(m[1]))],
  ['GET', /^\/api\/applications\/?$/, (req, res, m, url) => handleListApplications(req, res, url)],
  ['GET', /^\/api\/applications\/([^/]+)\/?$/, (req, res, m) => handleGetApplication(req, res, decodeURIComponent(m[1]))],

  ['GET', /^\/api\/interviewers\/?$/, (req, res, m, url) => handleListInterviewers(req, res, url)],
  ['GET', /^\/api\/interviewers\/me\/assignments\/?$/, (req, res) => handleMyAssignments(req, res)],
  ['GET', /^\/api\/interviewers\/me\/interviews\/?$/, (req, res, m, url) => handleMyInterviews(req, res, url)],
  ['GET', /^\/api\/interviewers\/([^/]+)\/availability\/?$/, (req, res, m, url) => handleGetAvailability(req, res, decodeURIComponent(m[1]), url)],
  ['PUT', /^\/api\/interviewers\/([^/]+)\/availability\/?$/, (req, res, m) => handlePutAvailability(req, res, decodeURIComponent(m[1]))],
  ['PUT', /^\/api\/interviewers\/([^/]+)\/positions\/?$/, (req, res, m) => handlePutPositions(req, res, decodeURIComponent(m[1]))],
  ['GET', /^\/api\/interviewers\/([^/]+)\/?$/, (req, res, m) => handleGetInterviewer(req, res, decodeURIComponent(m[1]))],

  ['GET', /^\/api\/rooms\/?$/, (req, res) => handleRooms(req, res)],

  ['PATCH', /^\/api\/schedule\/([^/]+)\/?$/, (req, res, m) => handlePatchEntry(req, res, decodeURIComponent(m[1]))],
  ['POST', /^\/api\/schedule\/([^/]+)\/resolve\/?$/, (req, res, m) => handleResolveEntry(req, res, decodeURIComponent(m[1]))],

  ['GET', /^\/api\/interviews\/([^/]+)\/assessment\/?$/, (req, res, m) => handleGetAssessment(req, res, decodeURIComponent(m[1]))],
  ['PUT', /^\/api\/interviews\/([^/]+)\/assessment\/?$/, (req, res, m) => handlePutAssessment(req, res, decodeURIComponent(m[1]))],

  ['GET', /^\/api\/notifications\/?$/, (req, res) => handleListNotifications(req, res)],
  ['PATCH', /^\/api\/notifications\/([^/]+)\/?$/, (req, res, m) => handlePatchNotification(req, res, decodeURIComponent(m[1]))],
];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  res.on('finish', () => {
    console.log(`${req.method} ${url.pathname} ${res.statusCode}`);
  });

  if (MODE === 'slow') await new Promise((resolve) => setTimeout(resolve, 2000));
  else if (MODE === 'normal') await new Promise((resolve) => setTimeout(resolve, 150));

  if (MODE === 'error' && !(req.method === 'POST' && url.pathname === '/api/auth/login')) {
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', 'The mock is in error mode');
  }

  for (const [method, pattern, handler] of routes) {
    if (req.method !== method) continue;
    const match = url.pathname.match(pattern);
    if (!match) continue;
    try {
      return await handler(req, res, match, url);
    } catch (error) {
      console.error(error);
      return fail(res, 500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error');
    }
  }
  return fail(res, 404, 'NOT_FOUND', 'No endpoint matches this method and path');
});

server.listen(PORT, () => {
  console.log(`ClubFlow mock API listening on http://localhost:${PORT} (mode: ${MODE})`);
});
