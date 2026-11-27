# Campaigns API

## 1. Overview

Recruitment campaign browsing, creation, publication and configuration.

Base path: `/api`. Visitors may read published campaigns. Only Executives may
create or change campaigns. At most one campaign may be `OPEN` at a time.

### Campaign statuses

| Status | Meaning |
|---|---|
| `DRAFT` | Being configured; not visible to visitors. |
| `OPEN` | Accepting applications. |
| `CLOSED` | The application period has ended. |
| `CONFIRMED` | The schedule is confirmed; configuration and schedule are read-only. |
| `COMPLETED` | Recruitment is finished; all interviews and final results are closed. |

### Campaign object

| Field | Type | Rules |
|---|---|---|
| `id` | string | Server-generated. |
| `name` | string | 1–150 characters. |
| `clubName` | string | 1–120 characters. |
| `description` | string | 0–2000 characters. |
| `instructions` | string | 0–2000 characters. |
| `status` | string | One of the campaign statuses above. |
| `applicationStartDate` | string | ISO 8601; must be before `applicationEndDate`. |
| `applicationEndDate` | string | ISO 8601; must be after `applicationStartDate`. |
| `interviewDate` | string | `YYYY-MM-DD`; must be after `applicationEndDate`. |
| `positions` | array | Position objects. At least one position is required before publication. |

Interview slots are managed through the dedicated `/slots` endpoints in
sections 9–11. They are not embedded in the campaign object; clients retrieve
them separately using `GET /api/campaigns/{campaignId}/slots`.

### Position object

| Field | Type | Rules |
|---|---|---|
| `id` | string | Server-generated. |
| `campaignId` | string | The owning campaign. |
| `name` | string | 1–150 characters. |
| `department` | string | 1–120 characters. |
| `quota` | integer | 1–100. |
| `description` | string | 0–1000 characters. |
| `requirements` | string | 0–1000 characters. |

### Position configuration rules

1. Positions can only be created, updated or deleted while the campaign is
   `DRAFT`.
2. Once a campaign becomes `OPEN`, its positions are read-only.
3. A position with existing applications cannot be deleted, even while the
   campaign is `DRAFT`.

## 2. List public campaigns

**Endpoint:** `GET /api/campaigns`  
**Access:** Public

| Query | Type | Required | Rules |
|---|---|---:|---|
| `status` | string | No | Filter by status. Visitors only receive `OPEN` and `CONFIRMED` campaigns. |
| `search` | string | No | Case-insensitive match on the campaign name. |
| `page` | integer | No | 1 or more; default 1. |
| `limit` | integer | No | 1–100; default 10. |

Visitors only receive campaigns whose status is `OPEN` or `CONFIRMED`.
The `status` query parameter is applied within this public visibility rule.
For example, a visitor requesting `status=DRAFT` receives an empty result,
not draft campaign data.

Authenticated Executives may use this endpoint to browse all campaigns,
including drafts. The same pagination and filtering rules apply.

### Example

```http
GET /api/campaigns?status=OPEN&page=1&limit=10
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": [{"id": "campaign_001", "name": "Tuyển thành viên CLB Công nghệ thông tin 2026", "clubName": "CLB Công nghệ thông tin", "description": "Tìm kiếm thành viên cho các ban Nội dung, Truyền thông và Kỹ thuật.", "instructions": "Nộp CV PDF tối đa 5 MB, thư động lực tối đa 300 từ và chọn khung giờ phỏng vấn.", "status": "OPEN", "applicationStartDate": "2026-10-15T00:00:00+07:00", "applicationEndDate": "2026-10-30T23:59:59+07:00", "interviewDate": "2026-11-05", "positions": [{"id": "position_001", "campaignId": "campaign_001", "name": "Content Creator", "department": "Ban Nội dung", "quota": 2, "description": "Viết nội dung và kế hoạch truyền thông.", "requirements": "Viết tiếng Việt rõ ràng."}, {"id": "position_002", "campaignId": "campaign_001", "name": "Communications Officer", "department": "Ban Truyền thông", "quota": 3, "description": "Điều phối kênh truyền thông của câu lạc bộ.", "requirements": "Có kinh nghiệm quản lý fanpage là lợi thế."}, {"id": "position_003", "campaignId": "campaign_001", "name": "Technical Member", "department": "Ban Kỹ thuật", "quota": 2, "description": "Phát triển website quản lý hoạt động câu lạc bộ.", "requirements": "Biết HTML/CSS cơ bản."}]}], "pagination": {"page": 1, "limit": 10, "totalItems": 1, "totalPages": 1}}
```

## 3. Get one campaign

**Endpoint:** `GET /api/campaigns/{campaignId}`  
**Access:** Public for public campaigns; Executive for drafts and completed campaigns.

- Visitors and non-Executive authenticated users may read `OPEN` and
  `CONFIRMED` campaigns.
- Only Executives may read campaigns in `DRAFT`, `CLOSED` or `COMPLETED`
  status.
- A non-Executive requesting a non-public campaign receives
  `403 FORBIDDEN`.

### Example

```http
GET /api/campaigns/campaign_001
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": {"id": "campaign_001", "name": "Tuyển thành viên CLB Công nghệ thông tin 2026", "clubName": "CLB Công nghệ thông tin", "description": "Tìm kiếm thành viên cho các ban Nội dung, Truyền thông và Kỹ thuật.", "instructions": "Nộp CV PDF tối đa 5 MB, thư động lực tối đa 300 từ và chọn khung giờ phỏng vấn.", "status": "OPEN", "applicationStartDate": "2026-10-15T00:00:00+07:00", "applicationEndDate": "2026-10-30T23:59:59+07:00", "interviewDate": "2026-11-05", "positions": [{"id": "position_001", "campaignId": "campaign_001", "name": "Content Creator", "department": "Ban Nội dung", "quota": 2, "description": "Viết nội dung và kế hoạch truyền thông.", "requirements": "Viết tiếng Việt rõ ràng."}, {"id": "position_002", "campaignId": "campaign_001", "name": "Communications Officer", "department": "Ban Truyền thông", "quota": 3, "description": "Điều phối kênh truyền thông của câu lạc bộ.", "requirements": "Có kinh nghiệm quản lý fanpage là lợi thế."}, {"id": "position_003", "campaignId": "campaign_001", "name": "Technical Member", "department": "Ban Kỹ thuật", "quota": 2, "description": "Phát triển website quản lý hoạt động câu lạc bộ.", "requirements": "Biết HTML/CSS cơ bản."}]}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | An authenticated request carries a missing, invalid or expired token. |
| `403` | `FORBIDDEN` | A non-Executive asks for a draft, closed or completed campaign. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |

## 4. Create a campaign

**Endpoint:** `POST /api/campaigns`  
**Access:** Executive  
**Content-Type:** `application/json`

The body contains the campaign fields defined in section 1, excluding
`id`, `status` and `positions[].id` / `positions[].campaignId`.
`positions` is required and must contain at least one position.
The campaign is always created with status `DRAFT`.

Interview slots are configured separately through
`POST /api/campaigns/{campaignId}/slots`.

### Example

```http
POST /api/campaigns
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"name": "Tuyển thành viên CLB Công nghệ thông tin 2027", "clubName": "CLB Công nghệ thông tin", "description": "Chiến dịch tuyển thành viên năm 2027.", "instructions": "Nộp CV PDF và thư động lực.", "applicationStartDate": "2027-10-01T00:00:00+07:00", "applicationEndDate": "2027-10-30T23:59:59+07:00", "interviewDate": "2027-11-05", "positions": [{"name": "Content Creator", "department": "Ban Nội dung", "quota": 2, "description": "Viết nội dung.", "requirements": "Viết tốt."}]}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"success": true, "message": "Campaign created successfully", "data": {"id": "campaign_003", "name": "Tuyển thành viên CLB Công nghệ thông tin 2027", "clubName": "CLB Công nghệ thông tin", "description": "Chiến dịch tuyển thành viên năm 2027.", "instructions": "Nộp CV PDF và thư động lực.", "status": "DRAFT", "applicationStartDate": "2027-10-01T00:00:00+07:00", "applicationEndDate": "2027-10-30T23:59:59+07:00", "interviewDate": "2027-11-05", "positions": [{"id": "position_301", "campaignId": "campaign_003", "name": "Content Creator", "department": "Ban Nội dung", "quota": 2, "description": "Viết nội dung.", "requirements": "Viết tốt."}]}}
```

### Example — invalid dates and missing positions

```http
POST /api/campaigns
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"name": "Chiến dịch lỗi", "clubName": "CLB Công nghệ thông tin", "description": "", "instructions": "", "applicationStartDate": "2027-11-30T00:00:00+07:00", "applicationEndDate": "2027-10-01T00:00:00+07:00", "interviewDate": "2027-09-01", "positions": []}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"success": false, "message": "Validation failed", "error": {"code": "VALIDATION_ERROR", "details": {"applicationEndDate": "Must be after applicationStartDate", "interviewDate": "Must be after applicationEndDate", "positions": "At least one position is required"}}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A required field is missing, a limit is exceeded, or dates are invalid. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected failure. |

Creating a campaign always creates a draft. The active-campaign check belongs
to `POST /api/campaigns/{campaignId}/open`, not to this endpoint.

## 5. Update a campaign

**Endpoint:** `PATCH /api/campaigns/{campaignId}`  
**Access:** Executive  
**Content-Type:** `application/json`

Only campaigns in `DRAFT` status can be updated. Only supplied fields are
replaced. The following fields cannot be changed through this endpoint:

- `id`
- `status`
- `positions`
- `slots`

Positions and interview slots are managed through their dedicated endpoints.
Once a campaign becomes `OPEN`, its campaign configuration is locked to
protect existing applications and their selected interview availability.

### Example

```http
PATCH /api/campaigns/campaign_003
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"name": "Tuyển thành viên CLB Công nghệ thông tin 2027 — cập nhật", "description": "Thông tin đã cập nhật."}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Campaign updated successfully", "data": {"id": "campaign_003", "name": "Tuyển thành viên CLB Công nghệ thông tin 2027 — cập nhật", "clubName": "CLB Công nghệ thông tin", "description": "Thông tin đã cập nhật.", "instructions": "Nộp CV PDF và thư động lực.", "status": "DRAFT", "applicationStartDate": "2027-10-01T00:00:00+07:00", "applicationEndDate": "2027-10-30T23:59:59+07:00", "interviewDate": "2027-11-05", "positions": [{"id": "position_301", "campaignId": "campaign_003", "name": "Content Creator", "department": "Ban Nội dung", "quota": 2, "description": "Viết nội dung.", "requirements": "Viết tốt."}]}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A supplied field is invalid or the dates would become impossible. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `CAMPAIGN_LOCKED` | The campaign is not `DRAFT`. |

## 6. Add a position

**Endpoint:** `POST /api/campaigns/{campaignId}/positions`  
**Access:** Executive

A position can only be added while its campaign is `DRAFT`. Once the campaign
is opened, positions are locked.

| Field | Type | Required | Rules |
|---|---|---:|---|
| `name` | string | Yes | 1–150 characters. |
| `department` | string | Yes | 1–120 characters. |
| `quota` | integer | Yes | 1–100. |
| `description` | string | No | 0–1000 characters. |
| `requirements` | string | No | 0–1000 characters. |

### Example

```http
POST /api/campaigns/campaign_003/positions
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"name": "Technical Member", "department": "Ban Kỹ thuật", "quota": 2, "description": "Phát triển website.", "requirements": "Biết HTML/CSS."}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"success": true, "message": "Position created successfully", "data": {"id": "position_302", "campaignId": "campaign_003", "name": "Technical Member", "department": "Ban Kỹ thuật", "quota": 2, "description": "Phát triển website.", "requirements": "Biết HTML/CSS."}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A field is missing or outside its limit. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `CAMPAIGN_LOCKED` | The campaign is not `DRAFT`. |

## 7. Update a position

**Endpoint:** `PATCH /api/campaigns/{campaignId}/positions/{positionId}`  
**Access:** Executive

Only positions belonging to the specified campaign can be updated. The
campaign must be in `DRAFT` status. Only supplied position fields are
replaced; `id` and `campaignId` cannot be changed.

### Example

```http
PATCH /api/campaigns/campaign_003/positions/position_302
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"quota": 3, "requirements": "Biết HTML/CSS và làm việc nhóm."}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Position updated successfully", "data": {"id": "position_302", "campaignId": "campaign_003", "name": "Technical Member", "department": "Ban Kỹ thuật", "quota": 3, "description": "Phát triển website.", "requirements": "Biết HTML/CSS và làm việc nhóm."}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A supplied field is invalid. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `404` | `POSITION_NOT_FOUND` | The position does not belong to that campaign. |
| `409` | `CAMPAIGN_LOCKED` | The campaign is not `DRAFT`. |

## 8. Delete a position

**Endpoint:** `DELETE /api/campaigns/{campaignId}/positions/{positionId}`  
**Access:** Executive

Deletion is only allowed while the campaign is `DRAFT`. A position with
applications cannot be deleted; the request is refused so application records
cannot be orphaned.

### Example

```http
DELETE /api/campaigns/campaign_003/positions/position_302
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Position deleted successfully"}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `404` | `POSITION_NOT_FOUND` | The position does not belong to that campaign. |
| `409` | `POSITION_HAS_APPLICATIONS` | At least one application refers to the position. |
| `409` | `CAMPAIGN_LOCKED` | The campaign is not `DRAFT`. |

## 9. Create interview slots

**Endpoint:** `POST /api/campaigns/{campaignId}/slots`  
**Access:** Executive  
**Content-Type:** `application/json`

Creates one or more interview slots for a draft campaign. This endpoint creates
additional slots; it does not replace existing slots. The server generates a
unique ID for each created slot.

The operation must validate the new slots against both the existing slots and
the other slots in the same request. If any slot is invalid or overlaps, the
entire request fails and no slots are created.

Slots may be added only while the campaign is `DRAFT`.

### Request body

| Field | Type | Required | Rules |
|---|---|---:|---|
| `slots` | array | Yes | At least one slot object. |
| `slots[].startTime` | string | Yes | ISO 8601 with timezone offset; must be on the campaign `interviewDate`. |
| `slots[].endTime` | string | Yes | ISO 8601 with timezone offset; must be after `startTime`. |

A slot is invalid when it is outside the campaign interview date, when
`startTime` is not before `endTime`, when it overlaps an existing slot of the
same campaign, or when it overlaps another slot in the same request. Two slots
that only touch at the boundary (for example 13:00–13:20 and 13:20–13:40) do
not overlap.

### Example

```http
POST /api/campaigns/campaign_003/slots
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "slots": [
    {
      "startTime": "2027-11-05T13:00:00+07:00",
      "endTime": "2027-11-05T13:20:00+07:00"
    },
    {
      "startTime": "2027-11-05T13:20:00+07:00",
      "endTime": "2027-11-05T13:40:00+07:00"
    }
  ]
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "Interview slots created successfully",
  "data": [
    {
      "id": "slot_301",
      "campaignId": "campaign_003",
      "startTime": "2027-11-05T13:00:00+07:00",
      "endTime": "2027-11-05T13:20:00+07:00"
    },
    {
      "id": "slot_302",
      "campaignId": "campaign_003",
      "startTime": "2027-11-05T13:20:00+07:00",
      "endTime": "2027-11-05T13:40:00+07:00"
    }
  ]
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `slots` is missing or empty, a timestamp is malformed, a slot is outside the interview date, or `endTime` is not after `startTime`. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `CAMPAIGN_LOCKED` | The campaign is not `DRAFT`. |
| `409` | `SLOT_OVERLAP` | A new slot overlaps an existing slot or another slot in the same request. |

## 10. Delete an interview slot

**Endpoint:** `DELETE /api/campaigns/{campaignId}/slots/{slotId}`  
**Access:** Executive

Deletes one interview slot from a draft campaign. A slot can only be deleted
while the campaign is `DRAFT`. A slot selected by at least one application
cannot be deleted.

### Example

```http
DELETE /api/campaigns/campaign_003/slots/slot_302
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Interview slot deleted successfully"}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `404` | `SLOT_NOT_FOUND` | The slot does not belong to that campaign. |
| `409` | `CAMPAIGN_LOCKED` | The campaign is not `DRAFT`. |
| `409` | `SLOT_IN_USE` | At least one application selected the slot. |

## 11. List interview slots

**Endpoint:** `GET /api/campaigns/{campaignId}/slots`  
**Access:** Public for `OPEN` and `CONFIRMED` campaigns; Executive for campaigns in any status.

Applicants choose their availability from these slots. Applicants can retrieve
slots for an `OPEN` campaign and must submit the returned slot IDs through the
Applications API. Visitors and Applicants cannot retrieve slots belonging to a
`DRAFT`, `CLOSED` or `COMPLETED` campaign.

### Example

```http
GET /api/campaigns/campaign_001/slots
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": [{"id": "slot_001", "campaignId": "campaign_001", "startTime": "2026-11-05T09:00:00+07:00", "endTime": "2026-11-05T09:20:00+07:00"}, {"id": "slot_002", "campaignId": "campaign_001", "startTime": "2026-11-05T09:20:00+07:00", "endTime": "2026-11-05T09:40:00+07:00"}, {"id": "slot_003", "campaignId": "campaign_001", "startTime": "2026-11-05T09:40:00+07:00", "endTime": "2026-11-05T10:00:00+07:00"}, {"id": "slot_004", "campaignId": "campaign_001", "startTime": "2026-11-05T10:00:00+07:00", "endTime": "2026-11-05T10:20:00+07:00"}, {"id": "slot_005", "campaignId": "campaign_001", "startTime": "2026-11-05T10:20:00+07:00", "endTime": "2026-11-05T10:40:00+07:00"}, {"id": "slot_006", "campaignId": "campaign_001", "startTime": "2026-11-05T10:40:00+07:00", "endTime": "2026-11-05T11:00:00+07:00"}]}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `403` | `FORBIDDEN` | A non-Executive requests slots for a non-public campaign. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |

## 12. Close a campaign

**Endpoint:** `POST /api/campaigns/{campaignId}/close`  
**Access:** Executive

Only an `OPEN` campaign can be closed. Existing applications remain available
for screening, but new applications are refused. Closing the active campaign is
also what frees the slot for the next one to be opened.

### Example

```http
POST /api/campaigns/campaign_001/close
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Campaign closed successfully", "data": {"id": "campaign_001", "status": "CLOSED"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `INVALID_CAMPAIGN_STATUS` | The campaign is not `OPEN`. |

## 13. Open (publish) a campaign

**Endpoint:** `POST /api/campaigns/{campaignId}/open`  
**Access:** Executive

The campaign must be `DRAFT`, have at least one position, have valid dates, and
no other campaign may be `OPEN`.

The one-active-campaign rule means **at most one campaign may have status
`OPEN` at a time**. A `CLOSED`, `CONFIRMED` or `COMPLETED` campaign does not
count as active for this rule.

### Example

```http
POST /api/campaigns/campaign_003/open
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Campaign opened successfully", "data": {"id": "campaign_003", "status": "OPEN"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | Required fields or positions are missing, or the dates are invalid. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `INVALID_CAMPAIGN_STATUS` | The campaign is not `DRAFT`. |
| `409` | `ACTIVE_CAMPAIGN_EXISTS` | Another campaign is already `OPEN`. |

## 14. Confirm the campaign

**Endpoint:** `POST /api/campaigns/{campaignId}/confirm`  
**Access:** Executive  
**Body:** `{"confirm": true}`

Confirmation is refused while any condition fails. The error names every
blocking application so the screen can show what to fix. A campaign in a status
other than `CLOSED` cannot be confirmed.

### Example — refused because blockers remain

```http
POST /api/campaigns/campaign_001/confirm
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"confirm": true}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"success": false, "message": "Campaign cannot be confirmed while blockers remain.", "error": {"code": "CONFIRMATION_NOT_ALLOWED", "details": {"campaignId": "campaign_001", "campaignClosed": true, "unreviewedApplications": ["A08", "A09"], "conflicts": ["A01", "A02"], "unassigned": ["A05", "A06"]}}}
```

### Rules checked before confirmation

1. The campaign is `CLOSED`.
2. Every application has been reviewed.
3. Every `SHORTLISTED` application has one valid entry.
4. No entry is `UNASSIGNED` or `CONFLICT`.
5. Every entry has an available interviewer, applicant, room and time slot.

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | The request body is missing or `confirm` is not `true`. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `CONFIRMATION_NOT_ALLOWED` | The campaign is not `CLOSED`, or one or more confirmation blockers remain. |
| `409` | `CAMPAIGN_ALREADY_CONFIRMED` | The campaign is already confirmed. |

The `CONFIRMATION_NOT_ALLOWED` response must include `details` describing
the blockers when the campaign is not ready.

## 15. Campaign completion lifecycle

**Endpoint:** `POST /api/campaigns/{campaignId}/complete`  
**Access:** Executive

Marks a confirmed campaign as `COMPLETED`. The operation has no request body;
any body sent is ignored.

`COMPLETED` is a valid campaign status, but it is never set automatically just
because the schedule was confirmed or the interview date has passed. Only this
operation performs the transition.

### Rules checked before completion

1. The campaign is `CONFIRMED`.
2. Every schedule entry has status `COMPLETED`; no entry remains `PROPOSED`,
   `UNASSIGNED`, `CONFLICT` or `CONFIRMED`.
3. Every completed interview has a submitted assessment.
4. Every `SHORTLISTED` application has a recorded final result.
5. Every recorded final result has been published.

If a rule fails, the campaign stays `CONFIRMED` and the error describes the
remaining work. The campaign does not change when the request is refused.

### Success response

Once every blocker is cleared, the same request answers `200 OK` with:

```json
{
  "success": true,
  "message": "Campaign marked as completed",
  "data": {
    "id": "campaign_002",
    "status": "COMPLETED"
  }
}
```

### Example — refused because the campaign is not confirmed

```http
POST /api/campaigns/campaign_001/complete
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "success": false,
  "message": "Only a confirmed campaign can be completed",
  "error": {
    "code": "CAMPAIGN_NOT_CONFIRMED"
  }
}
```

### Example — refused because interviews and results remain open

A confirmed campaign can still have unfinished interviews, missing assessments
or unpublished results. The `details` object names every blocker.

```http
POST /api/campaigns/campaign_002/complete
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "success": false,
  "message": "Campaign cannot be completed while blockers remain.",
  "error": {
    "code": "COMPLETION_NOT_ALLOWED",
    "details": {
      "campaignId": "campaign_002",
      "interviewsNotCompleted": ["interview_101"],
      "assessmentsMissing": ["interview_101"],
      "resultsMissing": ["application_101"],
      "resultsUnpublished": []
    }
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `CAMPAIGN_NOT_CONFIRMED` | The campaign is not `CONFIRMED`. |
| `409` | `COMPLETION_NOT_ALLOWED` | One or more completion blockers remain; `details` names them. |
| `409` | `CAMPAIGN_ALREADY_COMPLETED` | The campaign is already `COMPLETED`. |

After completion, campaign configuration, schedule assignments and final
results remain read-only. Applicants can still read their own published
results, and Interviewers can still read their completed interviews and
assessments.

## 16. Common errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | A protected endpoint receives a missing or invalid token. |
| `403` | `FORBIDDEN` | The caller does not have permission to perform the operation. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `404` | `POSITION_NOT_FOUND` | No position has that id in the campaign. |
| `404` | `SLOT_NOT_FOUND` | No slot has that id in the campaign. |
| `409` | `CAMPAIGN_LOCKED` | The campaign status does not allow the requested configuration change. |

## 17. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added `clubName`, `instructions`, position `quota` and the campaign/position examples. Added slots. Defined the refusal details for confirmation. | Match the PA#3 campaign form and C9 blockers; make every endpoint testable. |
| 2026-11-25 | Restricted campaign and position configuration to `DRAFT`; clarified public slot visibility; moved active-campaign validation to the open operation; standardized authorization and confirmation errors. | Prevent changes that could invalidate existing applications and keep campaign lifecycle behavior consistent across API contracts. |
| 2026-11-25 | Added full request, response and example definitions for `POST /api/campaigns/{campaignId}/slots` and `DELETE /api/campaigns/{campaignId}/slots/{slotId}`. | Give the Backend and Mock teams a concrete payload contract that `contract-check.mjs` can execute. |
| 2026-11-25 | Defined `POST /api/campaigns/{campaignId}/complete` and its blockers, including completed interviews, assessments and published results. | Close the `CONFIRMED` → `COMPLETED` lifecycle gap consistently with the Schedules and Results APIs. |
