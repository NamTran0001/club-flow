# Interviewers API

## 1. Overview

Interviewer directory, position assignments and availability. Interviewers are
pre-created users with the `INTERVIEWER` role; a department is not a role.

Base path: `/api`.

### Interviewer object

| Field | Type | Rules |
|---|---|---|
| `id` | string | The user id. |
| `fullName` | string | Display name. |
| `email` | string | Account e-mail. |
| `role` | string | Always `INTERVIEWER`. |
| `assignedPositionIds` | array of strings | Positions the interviewer may conduct. |

### Availability object

| Field | Type | Rules |
|---|---|---|
| `id` | string | Server-generated. |
| `interviewerId` | string | The interviewer. |
| `campaignId` | string | The campaign the availability belongs to. |
| `startTime` | string | ISO 8601. |
| `endTime` | string | ISO 8601; after `startTime`. |
| `isAvailable` | boolean | Always `true` for a stored slot. |

## 2. List interviewers

**Endpoint:** `GET /api/interviewers`  
**Access:** Executive only

| Query | Type | Required | Rules |
|---|---|---:|---|
| `search` | string | No | Match name or e-mail. |
| `positionId` | string | No | Only interviewers assigned to that position. |
| `page` | integer | No | 1 or more; default 1. |
| `limit` | integer | No | 1–100; default 10. |

### Example

```http
GET /api/interviewers?positionId=position_001&page=1&limit=10
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": [{"id": "u-int-content", "fullName": "Phan Minh Đức", "email": "int-content@clubflow.test", "role": "INTERVIEWER", "assignedPositionIds": ["position_001"]}], "pagination": {"page": 1, "limit": 10, "totalItems": 1, "totalPages": 1}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |

## 3. Get one interviewer

**Endpoint:** `GET /api/interviewers/{interviewerId}`  
**Access:** Executive · Interviewer own profile

### Example — Executive

```http
GET /api/interviewers/u-int-content
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": {"id": "u-int-content", "fullName": "Phan Minh Đức", "email": "int-content@clubflow.test", "role": "INTERVIEWER", "assignedPositionIds": ["position_001"]}}
```

### Example — another interviewer

```http
GET /api/interviewers/u-int-content
Authorization: Bearer {{token:int-comms}}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"success": false, "message": "You cannot access this interviewer", "error": {"code": "FORBIDDEN"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | An interviewer asks for another interviewer. |
| `404` | `INTERVIEWER_NOT_FOUND` | No interviewer has that id. |

## 4. Replace position assignments

**Endpoint:** `PUT /api/interviewers/{interviewerId}/positions`  
**Access:** Executive only  
**Content-Type:** `application/json`

The body replaces the interviewer's assignments for one campaign.

| Field | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | Yes | The campaign that owns the positions. |
| `positionIds` | array of strings | Yes | Every position must belong to the campaign. An empty array removes all assignments. |

### Example

```http
PUT /api/interviewers/u-int-content/positions
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"campaignId": "campaign_001", "positionIds": ["position_001"]}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Interviewer positions updated successfully", "data": {"interviewerId": "u-int-content", "assignedPositionIds": ["position_001"]}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `campaignId` is missing, or `positionIds` is not an array. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `INTERVIEWER_NOT_FOUND` | No interviewer has that id. |
| `404` | `POSITION_NOT_FOUND` | A position does not exist in the campaign. |
| `409` | `INVALID_INTERVIEWER_ROLE` | The user does not have the `INTERVIEWER` role. |
| `409` | `ASSIGNMENT_LOCKED` | The campaign is confirmed. |

## 5. Read availability

**Endpoint:** `GET /api/interviewers/{interviewerId}/availability`  
**Access:** Executive · Interviewer own

| Query | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | Yes | The campaign to read. |

### Example

```http
GET /api/interviewers/u-int-content/availability?campaignId=campaign_001
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": [{"id": "availability_001", "interviewerId": "u-int-content", "campaignId": "campaign_001", "startTime": "2026-11-05T09:00:00+07:00", "endTime": "2026-11-05T11:00:00+07:00", "isAvailable": true}, {"id": "availability_002", "interviewerId": "u-int-content", "campaignId": "campaign_001", "startTime": "2026-11-05T11:20:00+07:00", "endTime": "2026-11-05T12:00:00+07:00", "isAvailable": true}]}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `campaignId` is missing. |
| `403` | `FORBIDDEN` | An interviewer asks for another interviewer. |
| `404` | `INTERVIEWER_NOT_FOUND` | No interviewer has that id. |

## 6. Replace availability

**Endpoint:** `PUT /api/interviewers/{interviewerId}/availability`  
**Access:** Executive only  
**Content-Type:** `application/json`

| Field | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | Yes | The campaign. |
| `slots` | array | Yes | Non-overlapping `{startTime, endTime}` intervals inside the campaign interview date. |

### Example

```http
PUT /api/interviewers/u-int-content/availability
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"campaignId": "campaign_001", "slots": [{"startTime": "2026-11-05T09:00:00+07:00", "endTime": "2026-11-05T11:00:00+07:00"}, {"startTime": "2026-11-05T11:20:00+07:00", "endTime": "2026-11-05T12:00:00+07:00"}]}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Interviewer availability updated successfully", "data": {"interviewerId": "u-int-content", "campaignId": "campaign_001", "slots": [{"id": "availability_001", "startTime": "2026-11-05T09:00:00+07:00", "endTime": "2026-11-05T11:00:00+07:00"}, {"id": "availability_002", "startTime": "2026-11-05T11:20:00+07:00", "endTime": "2026-11-05T12:00:00+07:00"}]}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A slot is malformed, `startTime` is not before `endTime`, or a slot is outside the interview date. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `INTERVIEWER_NOT_FOUND` | No interviewer has that id. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `409` | `AVAILABILITY_CONFLICT` | Two supplied slots overlap, or a change would invalidate a confirmed interview. |
| `409` | `SCHEDULE_ALREADY_CONFIRMED` | The schedule is confirmed and availability is read-only. |

## 7. Get my position assignments

**Endpoint:** `GET /api/interviewers/me/assignments`  
**Access:** Interviewer only

The server identifies the interviewer from the token.

### Example

```http
GET /api/interviewers/me/assignments
Authorization: Bearer {{token:int-comms}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": [{"campaignId": "campaign_001", "campaignName": "Tuyển thành viên CLB Công nghệ thông tin 2026", "positions": [{"id": "position_002", "name": "Communications Officer", "department": "Ban Truyền thông"}]}, {"campaignId": "campaign_002", "campaignName": "Tuyển thành viên CLB Công nghệ thông tin 2025", "positions": [{"id": "position_101", "name": "Content Creator", "department": "Ban Nội dung"}]}]}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Interviewer. |

## 8. Get my interviews

**Endpoint:** `GET /api/interviewers/me/interviews`  
**Access:** Interviewer only

Only confirmed interviews assigned to the caller are returned.

| Query | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | No | Filter by campaign. |
| `date` | string | No | `YYYY-MM-DD`. |
| `page` | integer | No | 1 or more; default 1. |
| `limit` | integer | No | 1–100; default 10. |

### Example

```http
GET /api/interviewers/me/interviews?page=1&limit=10
Authorization: Bearer {{token:int-comms}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": [{"id": "interview_101", "applicationId": "application_101", "campaignId": "campaign_002", "positionName": "Content Creator", "applicant": {"fullName": "Lê Thu Hà", "studentId": "24120103"}, "startTime": "2025-11-05T09:00:00+07:00", "endTime": "2025-11-05T09:20:00+07:00", "room": {"id": "room_a", "name": "Phòng A"}, "status": "CONFIRMED"}], "pagination": {"page": 1, "limit": 10, "totalItems": 1, "totalPages": 1}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | An invalid date or pagination value. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Interviewer. |

## 9. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added `campaignId` to position and availability operations, executable examples, and the read-only rule after confirmation. | Prevent cross-campaign assignments and make the interviewer workspace testable. |
