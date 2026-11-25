# Schedules API

## 1. Overview

Interview scheduling for one campaign: rooms, draft generation, manual
assignment, conflict resolution, saving and export. The schedule becomes
read-only after the campaign is confirmed.

Base path: `/api`.

### Entry statuses

| Status | Meaning |
|---|---|
| `PROPOSED` | A valid draft assignment. |
| `UNASSIGNED` | No valid slot/interviewer/room combination; `reason` explains why. |
| `CONFLICT` | The assignment overlaps another entry for the applicant, interviewer or room; `conflictWith` names the other entry. |
| `CONFIRMED` | The campaign is confirmed; the entry is read-only. |

### Schedule object

| Field | Type | Rules |
|---|---|---|
| `campaignId` | string | The campaign. |
| `date` | string | `YYYY-MM-DD`; the campaign interview date. |
| `startTime` | string | `HH:mm`. |
| `endTime` | string | `HH:mm`. |
| `slotDuration` | integer | 15, 20 or 30 minutes. |
| `status` | string | `DRAFT` or `CONFIRMED`. |
| `entries` | array | One entry per shortlisted application. |
| `summary` | object | `{total, proposed, conflict, unassigned}` computed from `entries`. |

### Entry object

| Field | Type | Rules |
|---|---|---|
| `id` | string | `interview_…`. |
| `applicationId` | string | The application being interviewed. |
| `applicationCode` | string | Human-readable code such as `A01`. |
| `applicantName` | string | Applicant display name. |
| `positionId` | string | Position applied for. |
| `positionName` | string | Position display name. |
| `interviewer` | object or null | `{id, fullName}` or `null` when unassigned. |
| `room` | object or null | `{id, name}` or `null` when unassigned. |
| `startTime` | string or null | ISO 8601, or `null` when unassigned. |
| `endTime` | string or null | ISO 8601, or `null` when unassigned. |
| `status` | string | One of the statuses above. |
| `reason` | string or null | Required for `UNASSIGNED`. |
| `conflictWith` | array of strings | Entry ids that overlap this one; empty when none. |
| `conflictReason` | string or null | Required for `CONFLICT`. |

## 2. List rooms

**Endpoint:** `GET /api/rooms`  
**Access:** Executive only

### Example

```http
GET /api/rooms
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": [{"id": "room_a", "name": "Phòng A", "location": "Tầng 2 (Media Lab)"}, {"id": "room_b", "name": "Phòng B", "location": "Tầng 2 (Phòng họp)"}, {"id": "room_c", "name": "Phòng C", "location": "Tầng 3 (Phòng Kỹ thuật)"}]}
```

## 3. Read the schedule

**Endpoint:** `GET /api/campaigns/{campaignId}/schedule`  
**Access:** Executive only

### Example

```http
GET /api/campaigns/campaign_001/schedule
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": {"campaignId": "campaign_001", "date": "2026-11-05", "startTime": "09:00", "endTime": "12:00", "slotDuration": 20, "status": "DRAFT", "entries": [{"id": "interview_001", "applicationId": "application_001", "applicationCode": "A01", "applicantName": "Nguyễn Minh Anh", "positionId": "position_001", "positionName": "Content Creator", "interviewer": {"id": "u-int-content", "fullName": "Phan Minh Đức"}, "room": {"id": "room_a", "name": "Phòng A"}, "startTime": "2026-11-05T09:00:00+07:00", "endTime": "2026-11-05T09:20:00+07:00", "status": "CONFLICT", "reason": null, "conflictWith": ["interview_002"], "conflictReason": "Applicant Nguyễn Minh Anh also has interview_002 at the same time."}, {"id": "interview_002", "applicationId": "application_002", "applicationCode": "A02", "applicantName": "Nguyễn Minh Anh", "positionId": "position_002", "positionName": "Communications Officer", "interviewer": {"id": "u-int-comms", "fullName": "Trần Thanh Tùng"}, "room": {"id": "room_c", "name": "Phòng C"}, "startTime": "2026-11-05T09:00:00+07:00", "endTime": "2026-11-05T09:20:00+07:00", "status": "CONFLICT", "reason": null, "conflictWith": ["interview_001"], "conflictReason": "Applicant Nguyễn Minh Anh also has interview_001 at the same time."}, {"id": "interview_003", "applicationId": "application_003", "applicationCode": "A03", "applicantName": "Lê Thu Hà", "positionId": "position_002", "positionName": "Communications Officer", "interviewer": {"id": "u-int-comms", "fullName": "Trần Thanh Tùng"}, "room": {"id": "room_b", "name": "Phòng B"}, "startTime": "2026-11-05T09:20:00+07:00", "endTime": "2026-11-05T09:40:00+07:00", "status": "PROPOSED", "reason": null, "conflictWith": [], "conflictReason": null}, {"id": "interview_004", "applicationId": "application_004", "applicationCode": "A04", "applicantName": "Phạm Quốc Bảo", "positionId": "position_001", "positionName": "Content Creator", "interviewer": {"id": "u-int-content", "fullName": "Phan Minh Đức"}, "room": {"id": "room_a", "name": "Phòng A"}, "startTime": "2026-11-05T09:20:00+07:00", "endTime": "2026-11-05T09:40:00+07:00", "status": "PROPOSED", "reason": null, "conflictWith": [], "conflictReason": null}, {"id": "interview_005", "applicationId": "application_005", "applicationCode": "A05", "applicantName": "Đỗ Đức Thắng", "positionId": "position_003", "positionName": "Technical Member", "interviewer": null, "room": null, "startTime": null, "endTime": null, "status": "UNASSIGNED", "reason": "No common availability: the applicant is free 09:00–09:20 while Ngô Ngọc Yến is free 10:00–10:20.", "conflictWith": [], "conflictReason": null}], "summary": {"total": 5, "proposed": 2, "conflict": 2, "unassigned": 1}}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `404` | `SCHEDULE_NOT_FOUND` | No schedule has been generated for the campaign. |

## 4. Generate a draft schedule

**Endpoint:** `POST /api/campaigns/{campaignId}/schedule/generate`  
**Access:** Executive only  
**Content-Type:** `application/json`

| Field | Type | Required | Rules |
|---|---|---:|---|
| `date` | string | Yes | The campaign interview date. |
| `startTime` | string | Yes | `HH:mm`. |
| `endTime` | string | Yes | `HH:mm`, after `startTime`. |
| `slotDuration` | integer | Yes | 15, 20 or 30. |

Only `SHORTLISTED` applications enter the draft. The generator picks the first
available slot, interviewer and room. An application with no valid combination
stays `UNASSIGNED` with a reason. A real overlap is labelled `CONFLICT`.

### Example

```http
POST /api/campaigns/campaign_001/schedule/generate
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"date": "2026-11-05", "startTime": "09:00", "endTime": "12:00", "slotDuration": 20}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Draft schedule generated", "data": {"campaignId": "campaign_001", "date": "2026-11-05", "startTime": "09:00", "endTime": "12:00", "slotDuration": 20, "status": "DRAFT", "entries": [{"id": "interview_001", "applicationId": "application_001", "applicationCode": "A01", "applicantName": "Nguyễn Minh Anh", "positionId": "position_001", "positionName": "Content Creator", "interviewer": {"id": "u-int-content", "fullName": "Phan Minh Đức"}, "room": {"id": "room_a", "name": "Phòng A"}, "startTime": "2026-11-05T09:00:00+07:00", "endTime": "2026-11-05T09:20:00+07:00", "status": "CONFLICT", "reason": null, "conflictWith": ["interview_002"], "conflictReason": "Applicant Nguyễn Minh Anh also has interview_002 at the same time."}, {"id": "interview_002", "applicationId": "application_002", "applicationCode": "A02", "applicantName": "Nguyễn Minh Anh", "positionId": "position_002", "positionName": "Communications Officer", "interviewer": {"id": "u-int-comms", "fullName": "Trần Thanh Tùng"}, "room": {"id": "room_c", "name": "Phòng C"}, "startTime": "2026-11-05T09:00:00+07:00", "endTime": "2026-11-05T09:20:00+07:00", "status": "CONFLICT", "reason": null, "conflictWith": ["interview_001"], "conflictReason": "Applicant Nguyễn Minh Anh also has interview_001 at the same time."}, {"id": "interview_003", "applicationId": "application_003", "applicationCode": "A03", "applicantName": "Lê Thu Hà", "positionId": "position_002", "positionName": "Communications Officer", "interviewer": {"id": "u-int-comms", "fullName": "Trần Thanh Tùng"}, "room": {"id": "room_b", "name": "Phòng B"}, "startTime": "2026-11-05T09:20:00+07:00", "endTime": "2026-11-05T09:40:00+07:00", "status": "PROPOSED", "reason": null, "conflictWith": [], "conflictReason": null}, {"id": "interview_004", "applicationId": "application_004", "applicationCode": "A04", "applicantName": "Phạm Quốc Bảo", "positionId": "position_001", "positionName": "Content Creator", "interviewer": {"id": "u-int-content", "fullName": "Phan Minh Đức"}, "room": {"id": "room_a", "name": "Phòng A"}, "startTime": "2026-11-05T09:20:00+07:00", "endTime": "2026-11-05T09:40:00+07:00", "status": "PROPOSED", "reason": null, "conflictWith": [], "conflictReason": null}, {"id": "interview_005", "applicationId": "application_005", "applicationCode": "A05", "applicantName": "Đỗ Đức Thắng", "positionId": "position_003", "positionName": "Technical Member", "interviewer": null, "room": null, "startTime": null, "endTime": null, "status": "UNASSIGNED", "reason": "No common availability: the applicant is free 09:00–09:20 while Ngô Ngọc Yến is free 10:00–10:20.", "conflictWith": [], "conflictReason": null}], "summary": {"total": 5, "proposed": 2, "conflict": 2, "unassigned": 1}}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | The date/window is invalid, `slotDuration` is not 15/20/30, or no shortlisted application exists. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `409` | `SCHEDULE_ALREADY_CONFIRMED` | The schedule is confirmed; regeneration is disabled. |

## 5. Edit one entry

**Endpoint:** `PATCH /api/schedule/{entryId}`  
**Access:** Executive only  
**Content-Type:** `application/json`

| Field | Type | Required | Rules |
|---|---|---:|---|
| `startTime` | string | No | ISO 8601; must stay inside the campaign interview date. |
| `endTime` | string | No | ISO 8601; after `startTime`. |
| `interviewerId` | string | No | Must be qualified for the position and available. |
| `roomId` | string | No | Must be free for the interval. |

The mock rechecks the applicant, interviewer and room overlaps after the edit.

### Example

```http
PATCH /api/schedule/interview_003
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"startTime": "2026-11-05T10:00:00+07:00", "endTime": "2026-11-05T10:20:00+07:00"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Schedule entry updated", "data": {"id": "interview_003", "applicationId": "application_003", "applicationCode": "A03", "applicantName": "Lê Thu Hà", "positionId": "position_002", "positionName": "Communications Officer", "interviewer": {"id": "u-int-comms", "fullName": "Trần Thanh Tùng"}, "room": {"id": "room_b", "name": "Phòng B"}, "startTime": "2026-11-05T10:00:00+07:00", "endTime": "2026-11-05T10:20:00+07:00", "status": "PROPOSED", "reason": null, "conflictWith": [], "conflictReason": null}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A time is malformed or outside the interview date. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `ENTRY_NOT_FOUND` | No schedule entry has that id. |
| `409` | `SCHEDULE_CONFLICT` | The change would overlap the applicant, interviewer or room. |
| `409` | `SCHEDULE_ALREADY_CONFIRMED` | The schedule is confirmed and read-only. |

## 6. Resolve one conflict

**Endpoint:** `POST /api/schedule/{entryId}/resolve`  
**Access:** Executive only

The mock moves the entry to the first free slot that keeps the same qualified
interviewer and room. It answers `409` when no slot is free.

### Example

```http
POST /api/schedule/interview_001/resolve
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Conflict resolved", "data": {"id": "interview_001", "applicationId": "application_001", "applicationCode": "A01", "applicantName": "Nguyễn Minh Anh", "positionId": "position_001", "positionName": "Content Creator", "interviewer": {"id": "u-int-content", "fullName": "Phan Minh Đức"}, "room": {"id": "room_a", "name": "Phòng A"}, "startTime": "2026-11-05T09:40:00+07:00", "endTime": "2026-11-05T10:00:00+07:00", "status": "PROPOSED", "reason": null, "conflictWith": [], "conflictReason": null}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `ENTRY_NOT_FOUND` | No schedule entry has that id. |
| `409` | `NO_AVAILABLE_SLOT` | No valid slot remains. |
| `409` | `SCHEDULE_ALREADY_CONFIRMED` | The schedule is confirmed. |

## 7. Assign a slot manually

**Endpoint:** `POST /api/campaigns/{campaignId}/schedule/entries`  
**Access:** Executive only  
**Content-Type:** `application/json`

| Field | Type | Required | Rules |
|---|---|---:|---|
| `applicationId` | string | Yes | A shortlisted application in the campaign. |
| `startTime` | string | Yes | ISO 8601. |
| `endTime` | string | Yes | ISO 8601, after `startTime`. |
| `interviewerId` | string | Yes | Qualified and available. |
| `roomId` | string | Yes | Free for the interval. |

### Example

```http
POST /api/campaigns/campaign_001/schedule/entries
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"applicationId": "application_005", "startTime": "2026-11-05T10:00:00+07:00", "endTime": "2026-11-05T10:20:00+07:00", "interviewerId": "u-int-tech", "roomId": "room_c"}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"success": true, "message": "Slot assigned", "data": {"id": "interview_005", "applicationId": "application_005", "applicationCode": "A05", "applicantName": "Đỗ Đức Thắng", "positionId": "position_003", "positionName": "Technical Member", "interviewer": {"id": "u-int-tech", "fullName": "Ngô Ngọc Yến"}, "room": {"id": "room_c", "name": "Phòng C"}, "startTime": "2026-11-05T10:00:00+07:00", "endTime": "2026-11-05T10:20:00+07:00", "status": "PROPOSED", "reason": null, "conflictWith": [], "conflictReason": null}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A field is missing or malformed. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `APPLICATION_NOT_FOUND` | The application does not exist. |
| `409` | `APPLICATION_NOT_SHORTLISTED` | The application is not shortlisted. |
| `409` | `INTERVIEWER_NOT_QUALIFIED` | The interviewer is not assigned to the position. |
| `409` | `SCHEDULE_CONFLICT` | The slot overlaps the applicant, interviewer or room. |

## 8. Save the draft

**Endpoint:** `PUT /api/campaigns/{campaignId}/schedule`  
**Access:** Executive only  
**Content-Type:** `application/json`

The body may be empty; the mock saves its in-memory draft. Saving never
confirms the schedule.

### Example

```http
PUT /api/campaigns/campaign_001/schedule
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Schedule saved", "data": {"campaignId": "campaign_001", "status": "DRAFT", "savedAt": "…"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `409` | `SCHEDULE_ALREADY_CONFIRMED` | The schedule is confirmed. |

## 9. Export the schedule

**Endpoint:** `GET /api/campaigns/{campaignId}/schedule/export`  
**Access:** Executive only

The answer is a CSV attachment with one row per entry.

### Example

```http
GET /api/campaigns/campaign_001/schedule/export
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="interview-schedule.csv"
```

## 10. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added the schedule resource, rooms, conflict details, manual assignment and export. | Cover C4, C8 and C9 with real Proposed/Unassigned/Conflict data. |
