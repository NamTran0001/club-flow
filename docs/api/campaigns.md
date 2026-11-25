# Campaigns API

## 1. Overview

Recruitment campaign browsing, creation, publication and configuration.

Base path: `/api`. Visitors may read published campaigns. Only Executives may
create or change campaigns. One campaign may be active at a time.

### Campaign statuses

| Status | Meaning |
|---|---|
| `DRAFT` | Being configured; not visible to visitors. |
| `OPEN` | Accepting applications. |
| `CLOSED` | The application period has ended. |
| `CONFIRMED` | The schedule is confirmed; configuration and schedule are read-only. |
| `COMPLETED` | Recruitment is finished. |

### Campaign object

| Field | Type | Rules |
|---|---|---|
| `id` | string | Server-generated. |
| `name` | string | 1–150 characters. |
| `clubName` | string | 1–120 characters. |
| `description` | string | 0–2000 characters. |
| `instructions` | string | 0–2000 characters. |
| `status` | string | One of the statuses above. |
| `applicationStartDate` | string | ISO 8601; must be before `applicationEndDate`. |
| `applicationEndDate` | string | ISO 8601; must be after `applicationStartDate`. |
| `interviewDate` | string | `YYYY-MM-DD`; must be after `applicationEndDate`. |
| `positions` | array | Position objects, at least one before publication. |

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

## 2. List public campaigns

**Endpoint:** `GET /api/campaigns`  
**Access:** Public

| Query | Type | Required | Rules |
|---|---|---:|---|
| `status` | string | No | Filter by status. Visitors only receive `OPEN` and `CONFIRMED` campaigns. |
| `search` | string | No | Case-insensitive match on the campaign name. |
| `page` | integer | No | 1 or more; default 1. |
| `limit` | integer | No | 1–100; default 10. |

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
**Access:** Public for public campaigns; Executive for drafts.

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
| `403` | `FORBIDDEN` | A non-Executive asks for a draft campaign. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |

## 4. Create a campaign

**Endpoint:** `POST /api/campaigns`  
**Access:** Executive  
**Content-Type:** `application/json`

The body has the campaign fields in section 1. `positions` is required and must
contain at least one position. The campaign is created as `DRAFT`.

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
| `400` | `VALIDATION_ERROR` | A required field is missing, a limit is exceeded, dates are impossible, or no position is supplied. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `409` | `ACTIVE_CAMPAIGN_EXISTS` | Another campaign is already `OPEN` and this one would become active immediately. Creating a draft is still allowed. |

## 5. Update a campaign

**Endpoint:** `PATCH /api/campaigns/{campaignId}`  
**Access:** Executive

Only supplied fields are replaced. The campaign must be `DRAFT` or `OPEN`.
Positions are managed through their own endpoints.

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
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `CAMPAIGN_LOCKED` | The campaign is `CONFIRMED` or `COMPLETED`. |

## 6. Close a campaign

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
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `INVALID_CAMPAIGN_STATUS` | The campaign is not `OPEN`. |

## 7. Open (publish) a campaign

**Endpoint:** `POST /api/campaigns/{campaignId}/open`  
**Access:** Executive

The campaign must be `DRAFT`, have at least one position, have valid dates, and
no other campaign may be `OPEN`.

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
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `INVALID_CAMPAIGN_STATUS` | The campaign is not `DRAFT`. |
| `409` | `ACTIVE_CAMPAIGN_EXISTS` | Another campaign is already `OPEN`. |

## 8. Add a position

**Endpoint:** `POST /api/campaigns/{campaignId}/positions`  
**Access:** Executive

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
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `CAMPAIGN_LOCKED` | The campaign is `CONFIRMED` or `COMPLETED`. |

## 9. Update a position

**Endpoint:** `PATCH /api/campaigns/{campaignId}/positions/{positionId}`  
**Access:** Executive

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
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `POSITION_NOT_FOUND` | The position does not belong to that campaign. |
| `409` | `CAMPAIGN_LOCKED` | The campaign is confirmed. |

## 10. Delete a position

**Endpoint:** `DELETE /api/campaigns/{campaignId}/positions/{positionId}`  
**Access:** Executive

A position with applications cannot be deleted; the request is refused so
application records cannot be orphaned.

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
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `POSITION_NOT_FOUND` | The position does not belong to that campaign. |
| `409` | `POSITION_HAS_APPLICATIONS` | At least one application refers to the position. |
| `409` | `CAMPAIGN_LOCKED` | The campaign is confirmed. |

## 11. Confirm the campaign

**Endpoint:** `POST /api/campaigns/{campaignId}/confirm`  
**Access:** Executive  
**Body:** `{"confirm": true}`

Confirmation is refused while any condition fails. The error names every
blocking application so the screen can show what to fix.

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
| `400` | `CONFIRMATION_NOT_ALLOWED` | The body is not `{"confirm": true}` or the campaign is not ready. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `409` | `CONFIRMATION_NOT_ALLOWED` | One or more blockers remain; `details` names them. |
| `409` | `CAMPAIGN_ALREADY_CONFIRMED` | The campaign is already confirmed. |

## 12. List the club's interview slots

**Endpoint:** `GET /api/campaigns/{campaignId}/slots`  
**Access:** Public

Applicants choose their availability from these slots.

### Example

```http
GET /api/campaigns/campaign_001/slots
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": [{"id": "slot_001", "campaignId": "campaign_001", "startTime": "2026-11-05T09:00:00+07:00", "endTime": "2026-11-05T09:20:00+07:00"}, {"id": "slot_002", "campaignId": "campaign_001", "startTime": "2026-11-05T09:20:00+07:00", "endTime": "2026-11-05T09:40:00+07:00"}, {"id": "slot_003", "campaignId": "campaign_001", "startTime": "2026-11-05T09:40:00+07:00", "endTime": "2026-11-05T10:00:00+07:00"}, {"id": "slot_004", "campaignId": "campaign_001", "startTime": "2026-11-05T10:00:00+07:00", "endTime": "2026-11-05T10:20:00+07:00"}, {"id": "slot_005", "campaignId": "campaign_001", "startTime": "2026-11-05T10:20:00+07:00", "endTime": "2026-11-05T10:40:00+07:00"}, {"id": "slot_006", "campaignId": "campaign_001", "startTime": "2026-11-05T10:40:00+07:00", "endTime": "2026-11-05T11:00:00+07:00"}]}
```

## 13. Errors

| Status | Code | When |
|---:|---|---|
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |
| `404` | `POSITION_NOT_FOUND` | No position has that id in the campaign. |
| `409` | `CAMPAIGN_LOCKED` | The campaign is confirmed and the operation would change it. |

## 14. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added `clubName`, `instructions`, position `quota` and the campaign/position examples. Added slots. Defined the refusal details for confirmation. | Match the PA#3 campaign form and C9 blockers; make every endpoint testable. |
