# Campaigns API

## 1. Overview

Campaign configuration, position management, interview slot definitions, and lifecycle transitions (`DRAFT` -> `OPEN` -> `CLOSED` -> `CONFIRMED`).

Base path: `/api`.

### Campaign statuses

| Status | Meaning |
|---|---|
| `DRAFT` | Being configured by the Executive; not visible to applicants. |
| `OPEN` | Published and accepting applications within the opening/closing window. |
| `CLOSED` | Application period ended; ready for final schedule confirmation. |
| `CONFIRMED` | Interview schedule approved; campaign, positions, and applications are read-only. |

---

## 2. List publicly visible campaigns

**Endpoint:** `GET /api/campaigns`  
**Access:** Public

| Query | Type | Required | Rules |
|---|---|---:|---|
| `status` | string | No | `OPEN` or `CLOSED`. |
| `page` | integer | No | 1 or more; default 1. |
| `limit` | integer | No | 1–100; default 10. |

### Example

```http
GET /api/campaigns?page=1&limit=10
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "id": "campaign_001",
      "name": "Tuyển thành viên CLB Công nghệ thông tin 2026",
      "clubName": "CLB Công nghệ thông tin",
      "description": "Tìm kiếm thành viên cho các ban Truyền thông, Sự kiện và Kỹ thuật.",
      "openingDate": "2026-10-15T00:00:00+07:00",
      "closingDate": "2026-10-30T23:59:59+07:00",
      "status": "OPEN"
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 2,
    "totalPages": 1
  }
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Invalid query parameter. |

---

## 3. Read one campaign

**Endpoint:** `GET /api/campaigns/{campaignId}`

**Access:** Public

Returns full campaign details, instructions, interview settings (`interviewDate`, `slotDurationMinutes`), and its `positions` array.

### Example

```http
GET /api/campaigns/campaign_001
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "campaign_001",
    "name": "Tuyển thành viên CLB Công nghệ thông tin 2026",
    "clubName": "CLB Công nghệ thông tin",
    "description": "Tìm kiếm thành viên cho các ban Truyền thông, Sự kiện và Kỹ thuật.",
    "openingDate": "2026-10-15T00:00:00+07:00",
    "closingDate": "2026-10-30T23:59:59+07:00",
    "instructions": "Nộp CV PDF (tối đa 5 MB), thư động lực (tối đa 300 từ) và chọn khung giờ phỏng vấn.",
    "interviewDate": "2026-11-05",
    "slotDurationMinutes": 20,
    "status": "OPEN",
    "positions": [
      {
        "id": "position_001",
        "department": "Media & Communications",
        "name": "Content Creator",
        "quota": 3,
        "description": "Biên tập nội dung và kịch bản truyền thông.",
        "requirements": "Kỹ năng viết tiếng Việt tốt."
      },
      ...
    ]
  }
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `404` | `CAMPAIGN_NOT_FOUND` | No campaign has that id. |

---

## 4. Create a draft campaign

**Endpoint:** `POST /api/campaigns`

**Access:** Executive only

**Content-Type:** `application/json`

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | string | Yes | 1–150 characters. |
| `clubName` | string | Yes | 1–120 characters. |
| `description` | string | Yes | 1–1000 characters. |
| `openingDate` | string | Yes | ISO 8601 timestamp. |
| `closingDate` | string | Yes | Must be strictly after `openingDate`. |
| `instructions` | string | Yes | 1–1000 characters. |

### Example — valid draft creation

```http
POST /api/campaigns
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "name": "Tuyển thành viên đợt 2 năm 2026",
  "clubName": "CLB Công nghệ thông tin",
  "description": "Tuyển bổ sung nhân sự cho học kỳ 2.",
  "openingDate": "2026-12-01T00:00:00+07:00",
  "closingDate": "2026-12-15T23:59:59+07:00",
  "instructions": "Nộp CV PDF tối đa 5 MB và thư động lực tối đa 300 từ."
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "Campaign created successfully",
  "data": {
    "id": "campaign_003",
    "name": "Tuyển thành viên đợt 2 năm 2026",
    "clubName": "CLB Công nghệ thông tin",
    "description": "Tuyển bổ sung nhân sự cho học kỳ 2.",
    "openingDate": "2026-12-01T00:00:00+07:00",
    "closingDate": "2026-12-15T23:59:59+07:00",
    "instructions": "Nộp CV PDF tối đa 5 MB và thư động lực tối đa 300 từ.",
    "status": "DRAFT",
    "positions": []
  }
}
```

### Example — validation error (impossible dates)

```http
POST /api/campaigns
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "name": "",
  "clubName": "CLB Công nghệ thông tin",
  "description": "Mô tả",
  "openingDate": "2026-12-15T00:00:00+07:00",
  "closingDate": "2026-12-01T23:59:59+07:00",
  "instructions": "Nộp CV"
}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "message": "Invalid campaign data",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "name": "Campaign name is required",
      "closingDate": "Closing date must be after opening date"
    }
  }
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Missing required fields or `closingDate <= openingDate`. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Executive. |

---

## 5. Update a draft campaign

**Endpoint:** `PATCH /api/campaigns/{campaignId}`

**Access:** Executive only

**Content-Type:** `application/json`

Updates campaign details or interview setup (`interviewDate`, `slotDurationMinutes`: `15`, `20`, or `30`).

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | string | No | 1–150 characters. |
| `description` | string | No | 1–1000 characters. |
| `openingDate` | string | No | ISO 8601 timestamp. |
| `closingDate` | string | No | Must be after `openingDate`. |
| `instructions` | string | No | 1–1000 characters. |
| `interviewDate` | string | No | `YYYY-MM-DD`, must be after `closingDate`. |
| `slotDurationMinutes` | integer | No | Must be `15`, `20`, or `30`. |

### Example

```http
PATCH /api/campaigns/campaign_003
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "interviewDate": "2026-12-20",
  "slotDurationMinutes": 20
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Campaign updated successfully",
  "data": {
    "id": "campaign_003",
    "interviewDate": "2026-12-20",
    "slotDurationMinutes": 20,
    "status": "DRAFT"
  }
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Invalid field or `slotDurationMinutes` not in `[15, 20, 30]`. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | Campaign does not exist. |
| `409` | `CAMPAIGN_LOCKED` | Campaign is already `CONFIRMED` and read-only. |

---

## 6. Add a position to a draft campaign

**Endpoint:** `POST /api/campaigns/{campaignId}/positions`

**Access:** Executive only

**Content-Type:** `application/json`

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `department` | string | Yes | 1–100 characters. |
| `name` | string | Yes | 1–120 characters. |
| `quota` | integer | Yes | 1 or more. |
| `description` | string | Yes | 1–500 characters. |
| `requirements` | string | Yes | 1–500 characters. |

### Example

```http
POST /api/campaigns/campaign_003/positions
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "department": "Media & Communications",
  "name": "Design & Media",
  "quota": 2,
  "description": "Thiết kế ấn phẩm truyền thông cho các sự kiện.",
  "requirements": "Biết sử dụng Figma hoặc Canva."
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "Position added successfully",
  "data": {
    "id": "position_201",
    "campaignId": "campaign_003",
    "department": "Media & Communications",
    "name": "Design & Media",
    "quota": 2,
    "description": "Thiết kế ấn phẩm truyền thông cho các sự kiện.",
    "requirements": "Biết sử dụng Figma hoặc Canva."
  }
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Missing field or `quota < 1`. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | Campaign does not exist. |
| `409` | `CAMPAIGN_LOCKED` | Campaign is `CONFIRMED`. |

---

## 7. Update a position

**Endpoint:** `PATCH /api/campaigns/{campaignId}/positions/{positionId}`

**Access:** Executive only

**Content-Type:** `application/json`

### Example

```http
PATCH /api/campaigns/campaign_003/positions/position_201
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "quota": 3
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Position updated successfully",
  "data": {
    "id": "position_201",
    "quota": 3
  }
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Invalid field value. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Executive. |
| `404` | `POSITION_NOT_FOUND` | Position or campaign does not exist. |
| `409` | `CAMPAIGN_LOCKED` | Campaign is `CONFIRMED`. |

---

## 8. Delete a position with no applications

**Endpoint:** `DELETE /api/campaigns/{campaignId}/positions/{positionId}`

**Access:** Executive only

### Example

```http
DELETE /api/campaigns/campaign_003/positions/position_201
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Position deleted successfully",
  "data": {
    "id": "position_201"
  }
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Executive. |
| `404` | `POSITION_NOT_FOUND` | Position does not exist. |
| `409` | `POSITION_HAS_APPLICATIONS` | Position already has submitted applications or campaign is `CONFIRMED`. |

---

## 9. Publish a draft campaign

**Endpoint:** `POST /api/campaigns/{campaignId}/open`

**Access:** Executive only

Validates required fields, dates, and at least one position before changing status from `DRAFT` to `OPEN`.

### Example — fails when campaign has zero positions

```http
POST /api/campaigns/campaign_003/open
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "message": "Cannot publish campaign without at least one position",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "positions": "Add at least one position before publishing"
    }
  }
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Missing required fields, invalid dates, or no positions. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | Campaign does not exist. |
| `409` | `INVALID_CAMPAIGN_STATE` | Campaign is already `OPEN`, `CLOSED`, or `CONFIRMED`. |

---

## 10. Close the application period

**Endpoint:** `POST /api/campaigns/{campaignId}/close`

**Access:** Executive only

Closes submissions (`OPEN` -> `CLOSED`) so the Executive can finalize schedule confirmation.

### Example

```http
POST /api/campaigns/campaign_002/close
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Campaign application period closed",
  "data": {
    "id": "campaign_002",
    "status": "CLOSED"
  }
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | Campaign does not exist. |
| `409` | `INVALID_CAMPAIGN_STATE` | Campaign is already `CONFIRMED`. |

---

## 11. Confirm the schedule and lock the campaign

**Endpoint:** `POST /api/campaigns/{campaignId}/confirm`

**Access:** Executive only

Approves and confirms the interview schedule (Step C9). Refused if the campaign is still `OPEN`, if any application is still `PENDING`, or if any shortlisted application in the schedule is `UNASSIGNED` or in `CONFLICT`. Once confirmed, the campaign and schedule become read-only (`CONFIRMED`).

### Example — refused while conflicts or unassigned entries remain

```http
POST /api/campaigns/campaign_001/confirm
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "success": false,
  "message": "Cannot confirm schedule while applications remain open, unreviewed, unassigned, or in conflict",
  "error": {
    "code": "SCHEDULE_NOT_READY",
    "details": {
      "unassigned": ["application_005"],
      "conflicts": ["application_001", "application_002"]
    }
  }
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | Campaign does not exist. |
| `409` | `SCHEDULE_NOT_READY` | Campaign still `OPEN`, unreviewed applications exist, or `UNASSIGNED`/`CONFLICT` entries remain. |

---

## 12. List the club's interview slots

**Endpoint:** `GET /api/campaigns/{campaignId}/slots`

**Access:** Public

Returns the available interview time slots configured for the campaign so Applicants can select their availability in Step C5.

### Example

```http
GET /api/campaigns/campaign_001/slots
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "id": "slot_001",
      "campaignId": "campaign_001",
      "date": "2026-11-05",
      "startTime": "09:00",
      "endTime": "09:20"
    },
    {
      "id": "slot_002",
      "campaignId": "campaign_001",
      "date": "2026-11-05",
      "startTime": "09:20",
      "endTime": "09:40"
    },
    ...
  ]
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `404` | `CAMPAIGN_NOT_FOUND` | Campaign does not exist. |

---

## 13. Changes

| Date | Change | Why |
| --- | --- | --- |
| 2026-11-26 | Aligned all 11 campaign endpoints, `{success, data}` response envelopes, status codes (`DRAFT`, `OPEN`, `CLOSED`, `CONFIRMED`), and IDs (`campaign_001`, `slot_001`) with `README.md` and `applications.md`. | Ensure `contract-check.mjs` passes all examples in alphabetical file order. |
