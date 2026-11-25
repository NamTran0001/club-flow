# ClubFlow API Contract

**Version:** 1.0  
**Date:** 2026-11-25  
**Course:** CSC13008 — PA#3  
**Base path:** `/api`

This directory is the authoritative contract for the ClubFlow API. The mock in
`mock/server.mjs` and the later Express server must answer exactly as written
here. When the implementation and this contract disagree, the implementation
is wrong.

## 1. Base URL and content types

All endpoints are relative to `/api`; the development server listens on
`http://localhost:3001` by default (`PORT` changes the port). There is no API
version segment.

Successful JSON answers use `Content-Type: application/json; charset=utf-8`.
The two export endpoints answer `text/csv`, and the CV endpoint answers
`application/pdf`.

## 2. Authentication

Every protected request carries a bearer token:

```http
Authorization: Bearer <access_token>
```

`POST /api/auth/login` returns the token. Accounts are created in advance; the
API has no registration, recovery or university single sign-on.

| Role | Code | Description |
|---|---|---|
| Executive | `EXECUTIVE` | Manages campaigns, interviewers, applications, schedules and final results. |
| Applicant | `APPLICANT` | Applies for positions and tracks only their own applications. |
| Interviewer | `INTERVIEWER` | Sees only assigned interviews and submits their assessments. |

A visitor is an unauthenticated caller. A department is an organisational
unit, not an access role.

The backend, not the front end, enforces authentication, role permissions,
resource ownership and interviewer assignment. A request that hides a button
in the browser is still checked here.

## 3. Common answer shape

A successful answer has `success: true` and a `data` member. A message is added
when the operation changes something. Lists add a `pagination` member.

```json
{
  "success": true,
  "message": "Campaign created successfully",
  "data": {}
}
```

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

## 4. Common error shape

Every error uses this shape:

```json
{
  "success": false,
  "message": "A human-readable message",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

Validation errors may add a field-level `details` object. A business error may
add contextual details, such as the existing application id or the rows that
block confirmation.

| Status | When |
|---:|---|
| `200 OK` | A successful read or update. |
| `201 Created` | A resource was created. |
| `400 Bad Request` | A field is missing, malformed or outside its limit. |
| `401 Unauthorized` | The token is missing, invalid or expired. |
| `403 Forbidden` | The caller is authenticated but not allowed to use this resource. |
| `404 Not Found` | The campaign, position, application, interview or notification does not exist. |
| `409 Conflict` | A business rule prevents the operation. |
| `500 Internal Server Error` | An unexpected failure. Never used for an expected validation failure. |

Shared error codes include `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`,
`NOT_FOUND` and `INTERNAL_SERVER_ERROR`. Resource files add their own codes.

## 5. Conventions

- IDs are opaque strings: `campaign_001`, `application_001`, `interview_001`.
- Timestamps are ISO 8601 with the Vietnam offset, e.g.
  `2026-11-05T09:00:00+07:00`. `interviewDate` uses `YYYY-MM-DD`.
- Pagination starts at page `1`. `limit` is 1–100 and defaults to 10.
- Unknown query parameters are ignored. Unknown paths answer `404 NOT_FOUND`.
- Request bodies are JSON unless the endpoint says `multipart/form-data`.
- Applicants may hold several applications in one campaign, at most one per
  position. A decision on one application never changes another.
- CV screening (`PENDING`, `SHORTLISTED`, `REJECTED`) is separate from
  interview state (`PROPOSED`, `UNASSIGNED`, `CONFLICT`, `CONFIRMED`) and from
  the final result (`PASS`, `FAIL`).
- A confirmed campaign and its schedule are read-only. Assessments and final
  results remain available afterwards.

## 6. Endpoint table

Every endpoint below has at least one executable example in the file named in
the last column. The examples are sent in this file order: `README.md` first,
then the other `docs/api/*.md` files in alphabetical order.

| Method | Path | Access | Description | File |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Sign in with a pre-created account. | `auth.md` |
| `GET` | `/api/auth/me` | Authenticated | Read the current user. | `auth.md` |
| `POST` | `/api/auth/logout` | Authenticated | Sign out. | `auth.md` |
| `GET` | `/api/campaigns` | Public | List publicly visible campaigns. | `campaigns.md` |
| `GET` | `/api/campaigns/{campaignId}` | Public | Read one campaign. | `campaigns.md` |
| `POST` | `/api/campaigns` | Executive | Create a draft campaign. | `campaigns.md` |
| `PATCH` | `/api/campaigns/{campaignId}` | Executive | Update a draft campaign. | `campaigns.md` |
| `POST` | `/api/campaigns/{campaignId}/open` | Executive | Publish a draft campaign. | `campaigns.md` |
| `POST` | `/api/campaigns/{campaignId}/close` | Executive | Close the application period. | `campaigns.md` |
| `POST` | `/api/campaigns/{campaignId}/confirm` | Executive | Confirm the schedule and lock the campaign. | `campaigns.md` |
| `POST` | `/api/campaigns/{campaignId}/positions` | Executive | Add a position to a draft campaign. | `campaigns.md` |
| `PATCH` | `/api/campaigns/{campaignId}/positions/{positionId}` | Executive | Update a position. | `campaigns.md` |
| `DELETE` | `/api/campaigns/{campaignId}/positions/{positionId}` | Executive | Delete a position with no applications. | `campaigns.md` |
| `GET` | `/api/campaigns/{campaignId}/slots` | Public | List the club's interview slots. | `campaigns.md` |
| `POST` | `/api/applications` | Applicant | Submit an application with a PDF CV. | `applications.md` |
| `GET` | `/api/applications/me` | Applicant | List the caller's applications. | `applications.md` |
| `GET` | `/api/applications/statistics` | Executive | Read application counts for a campaign. | `applications.md` |
| `GET` | `/api/applications/export` | Executive | Export applications as CSV. | `applications.md` |
| `GET` | `/api/applications` | Executive | List applications for screening. | `applications.md` |
| `GET` | `/api/applications/{applicationId}` | Applicant own · Executive · Interviewer assigned | Read one application. | `applications.md` |
| `PATCH` | `/api/applications/{applicationId}/screening` | Executive | Shortlist or reject one application. | `applications.md` |
| `GET` | `/api/applications/{applicationId}/cv` | Applicant own · Executive · Interviewer assigned | Download the CV PDF. | `applications.md` |
| `GET` | `/api/applications/{applicationId}/result` | Applicant own · Executive | Read the final result. | `results.md` |
| `PUT` | `/api/applications/{applicationId}/result` | Executive | Record Pass or Fail. | `results.md` |
| `POST` | `/api/applications/{applicationId}/result/publish` | Executive | Publish the result and notify the applicant. | `results.md` |
| `GET` | `/api/interviewers` | Executive | List interviewers. | `interviewers.md` |
| `GET` | `/api/interviewers/me/assignments` | Interviewer | Read the caller's position assignments. | `interviewers.md` |
| `GET` | `/api/interviewers/me/interviews` | Interviewer | Read the caller's confirmed interviews. | `interviewers.md` |
| `GET` | `/api/interviewers/{interviewerId}` | Executive · Interviewer own | Read one interviewer. | `interviewers.md` |
| `PUT` | `/api/interviewers/{interviewerId}/positions` | Executive | Replace an interviewer's position assignments. | `interviewers.md` |
| `GET` | `/api/interviewers/{interviewerId}/availability` | Executive · Interviewer own | Read availability. | `interviewers.md` |
| `PUT` | `/api/interviewers/{interviewerId}/availability` | Executive | Replace availability for a campaign. | `interviewers.md` |
| `GET` | `/api/rooms` | Executive | List the existing rooms. | `schedules.md` |
| `GET` | `/api/campaigns/{campaignId}/schedule` | Executive | Read the draft or confirmed schedule. | `schedules.md` |
| `POST` | `/api/campaigns/{campaignId}/schedule/generate` | Executive | Generate a draft schedule. | `schedules.md` |
| `POST` | `/api/campaigns/{campaignId}/schedule/entries` | Executive | Manually assign an application to a slot. | `schedules.md` |
| `PUT` | `/api/campaigns/{campaignId}/schedule` | Executive | Save the draft schedule. | `schedules.md` |
| `GET` | `/api/campaigns/{campaignId}/schedule/export` | Executive | Export the schedule as CSV. | `schedules.md` |
| `PATCH` | `/api/schedule/{entryId}` | Executive | Edit one schedule entry. | `schedules.md` |
| `POST` | `/api/schedule/{entryId}/resolve` | Executive | Resolve one conflicting entry. | `schedules.md` |
| `GET` | `/api/interviews/{interviewId}/assessment` | Executive · Interviewer assigned | Read the assessment. | `assessments.md` |
| `PUT` | `/api/interviews/{interviewId}/assessment` | Interviewer assigned | Create or replace the assessment. | `assessments.md` |
| `GET` | `/api/notifications` | Applicant | List the caller's notifications. | `notifications.md` |
| `PATCH` | `/api/notifications/{notificationId}` | Applicant own | Mark a notification as read. | `notifications.md` |

## 7. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Initial contract for PA#3: added the endpoint table, shared conventions, and examples for every endpoint. Added schedule, assessment, result and notification resources. | Complete C1–C11 and make the contract executable by `contract-check.mjs`. |
