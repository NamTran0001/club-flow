# Interviewers API

## 1. Overview

Interviewer profile lookup, position assignments, availability management (Step C4), and assigned confirmed interviews for Interviewers (Step C10).

Base path: `/api`.

### Rules
1. Interviewers are pre-created accounts (`INTERVIEWER` role) and never overlap with applicant names.
2. An Executive assigns each interviewer to one or more positions in the campaign and configures their available time slots.
3. An Interviewer can only read their own assignments, their own availability, and their own confirmed interviews (plus the CVs attached to those assigned applications).

---

## 2. List interviewers

**Endpoint:** `GET /api/interviewers`  
**Access:** Executive only

| Query | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | No | Filter assignments and availability by campaign. |

### Example

```http
GET /api/interviewers?campaignId=campaign_001
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "id": "u-int-content",
      "fullName": "Trần Thanh Tùng",
      "email": "int-content@clubflow.test",
      "positionIds": ["position_001"],
      "availabilitySlotIds": ["slot_001", "slot_002", "slot_003"]
    },
    {
      "id": "u-int-comms",
      "fullName": "Ngô Ngọc Yến",
      "email": "int-comms@clubflow.test",
      "positionIds": ["position_002"],
      "availabilitySlotIds": ["slot_001", "slot_003", "slot_004"]
    },
    ...
  ]
}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Executive. |

---

## 3. Read the caller's position assignments

**Endpoint:** `GET /api/interviewers/me/assignments`

**Access:** Interviewer only

### Example

```http
GET /api/interviewers/me/assignments
Authorization: Bearer {{token:int-content}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "interviewerId": "u-int-content",
    "campaignId": "campaign_001",
    "positions": [
      {
        "id": "position_001",
        "department": "Media & Communications",
        "name": "Content Creator"
      }
    ]
  }
}
```

### Errors

| Status | Code | When |
|---|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Interviewer. |

---

## 4. Read the caller's confirmed interviews

**Endpoint:** `GET /api/interviewers/me/interviews`

**Access:** Interviewer only

Returns only the confirmed interviews assigned to the signed-in Interviewer (Step C10), with links to read/download each assigned applicant's CV (internal screening notes are excluded).

### Example

```http
GET /api/interviewers/me/interviews
Authorization: Bearer {{token:int-content}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "id": "interview_001",
      "applicationId": "application_001",
      "applicantName": "Nguyễn Minh Anh",
      "studentId": "24120101",
      "positionId": "position_001",
      "positionName": "Content Creator",
      "date": "2026-11-05",
      "startTime": "09:00",
      "endTime": "09:20",
      "roomId": "room_001",
      "roomName": "Phòng A",
      "cvUrl": "/api/applications/application_001/cv",
      "assessmentStatus": "PENDING"
    },
    ...
  ]
}
```

### Errors

| Status | Code | When |
|---|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Interviewer. |

---

## 5. Read one interviewer

**Endpoint:** `GET /api/interviewers/{interviewerId}`

**Access:** Executive · Interviewer own

### Example

```http
GET /api/interviewers/u-int-content
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "u-int-content",
    "fullName": "Trần Thanh Tùng",
    "email": "int-content@clubflow.test",
    "positionIds": ["position_001"],
    "availabilitySlotIds": ["slot_001", "slot_002", "slot_003"]
  }
}
```

### Errors

| Status | Code | When |
|---|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Interviewer trying to read another interviewer's profile. |
| `404` | `INTERVIEWER_NOT_FOUND` | No interviewer has that id. |

---

## 6. Replace an interviewer's position assignments

**Endpoint:** `PUT /api/interviewers/{interviewerId}/positions`

**Access:** Executive only

**Content-Type:** `application/json`

| Field | Type | Required | Rules |
|---|---|---|---|
| `campaignId` | string | Yes | Must exist and not be `CONFIRMED`. |
| `positionIds` | array of string | Yes | At least 1 valid position id in the campaign. |

### Example

```http
PUT /api/interviewers/u-int-content/positions
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "campaignId": "campaign_001",
  "positionIds": ["position_001"]
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Interviewer position assignments updated",
  "data": {
    "interviewerId": "u-int-content",
    "campaignId": "campaign_001",
    "positionIds": ["position_001"]
  }
}
```

### Errors

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | `positionIds` is empty or contains an invalid position id. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Executive. |
| `404` | `INTERVIEWER_NOT_FOUND` | Interviewer does not exist. |
| `409` | `CAMPAIGN_LOCKED` | Campaign schedule is already `CONFIRMED`. |

---

## 7. Read availability

**Endpoint:** `GET /api/interviewers/{interviewerId}/availability`

**Access:** Executive · Interviewer own

| Query | Type | Required | Rules |
|---|---|---|---|
| `campaignId` | string | No | Filter by campaign; defaults to active campaign. |

### Example

```http
GET /api/interviewers/u-int-content/availability?campaignId=campaign_001
Authorization: Bearer {{token:int-content}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "interviewerId": "u-int-content",
    "campaignId": "campaign_001",
    "slotIds": ["slot_001", "slot_002", "slot_003"]
  }
}
```

### Errors

| Status | Code | When |
|---|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Interviewer trying to read another interviewer's availability. |
| `404` | `INTERVIEWER_NOT_FOUND` | Interviewer does not exist. |

---

## 8. Replace availability for a campaign

**Endpoint:** `PUT /api/interviewers/{interviewerId}/availability`

**Access:** Executive only

**Content-Type:** `application/json`

| Field | Type | Required | Rules |
|---|---|---|---|
| `campaignId` | string | Yes | Must exist and not be `CONFIRMED`. |
| `slotIds` | array of string | Yes | Valid slot ids from `GET /api/campaigns/{campaignId}/slots`. |

### Example

```http
PUT /api/interviewers/u-int-content/availability
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "campaignId": "campaign_001",
  "slotIds": ["slot_001", "slot_002", "slot_003"]
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Interviewer availability updated",
  "data": {
    "interviewerId": "u-int-content",
    "campaignId": "campaign_001",
    "slotIds": ["slot_001", "slot_002", "slot_003"]
  }
}
```

### Errors

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Unknown slot id or invalid payload. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Caller is not an Executive. |
| `404` | `INTERVIEWER_NOT_FOUND` | Interviewer does not exist. |
| `409` | `CAMPAIGN_LOCKED` | Campaign schedule is already `CONFIRMED`. |

---

## 9. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-26 | Aligned all 7 interviewer endpoints (`GET /api/interviewers`, `/me/assignments`, `/me/interviews`, `/{interviewerId}`, `/positions`, `/availability`), `{success, data}` response envelopes, and IDs (`u-int-content`, `u-int-comms`, `slot_001`) with `README.md` and `auth.md`. | Ensure 100% endpoint table coverage and pass `contract-check.mjs`. |
