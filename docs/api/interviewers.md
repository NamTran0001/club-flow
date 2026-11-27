# Interviewers API

## 1. Overview

Interviewer directory, campaign-specific position assignments and availability. Interviewers are pre-created users with the `INTERVIEWER` role; a department is not a role.

Base path: `/api`.

### Route matching order

Static `/me` routes must be registered before routes containing `{interviewerId}`:

1. `GET /api/interviewers/me/assignments`
2. `GET /api/interviewers/me/interviews`
3. `GET /api/interviewers`
4. `GET /api/interviewers/{interviewerId}`

This prevents the router from treating `me` as an interviewer ID.

### Interviewer object

| Field | Type | Rules |
|---|---|---|
| `id` | string | The user ID. |
| `fullName` | string | Display name. |
| `email` | string | Account e-mail. |
| `role` | string | Always `INTERVIEWER`. |
| `assignments` | array | Campaign-specific position assignments. |

### Assignment object

| Field | Type | Rules |
|---|---|---|
| `campaignId` | string | The campaign owning the assigned positions. |
| `positionIds` | array of strings | Position IDs belonging to the specified campaign. |

An interviewer may have assignments in multiple campaigns. A position ID must
always be interpreted within its campaign.

### Availability object

| Field | Type | Rules |
|---|---|---|
| `id` | string | Server-generated. |
| `interviewerId` | string | The interviewer. |
| `campaignId` | string | The campaign the availability belongs to. |
| `startTime` | string | ISO 8601 with timezone offset. |
| `endTime` | string | ISO 8601 with timezone offset; after `startTime`. |
| `isAvailable` | boolean | Always `true` for a stored availability interval. |

Availability intervals describe when an interviewer is available to conduct
interviews. They are separate from applicant-selected campaign interview
slots. A schedule entry must satisfy both the applicant's selected
availability and the assigned interviewer's availability.

## 2. List interviewers

**Endpoint:** `GET /api/interviewers`  
**Access:** Executive only

| Query | Type | Required | Rules |
|---|---|---:|---|
| `search` | string | No | Match name or e-mail. |
| `campaignId` | string | No | Only interviewers with assignments in this campaign. |
| `positionId` | string | No | Only interviewers assigned to this position. Requires `campaignId`. |
| `page` | integer | No | 1 or more; default 1. |
| `limit` | integer | No | 1–100; default 10. |

When `campaignId` is provided, only assignments belonging to that campaign
are considered. When both `campaignId` and `positionId` are provided, the
interviewer must be assigned to that specific position in that campaign.

### Example

```http
GET /api/interviewers?campaignId=campaign_001&positionId=position_001&page=1&limit=10
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
      "fullName": "Phan Minh Đức",
      "email": "int-content@clubflow.test",
      "role": "INTERVIEWER",
      "assignments": [
        {
          "campaignId": "campaign_001",
          "positionIds": ["position_001"]
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | Invalid pagination values, or `positionId` is supplied without `campaignId`. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |

## 3. Get one interviewer

**Endpoint:** `GET /api/interviewers/{interviewerId}`  
**Access:** Executive or the interviewer accessing their own profile.

### Example — Executive

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
    "fullName": "Phan Minh Đức",
    "email": "int-content@clubflow.test",
    "role": "INTERVIEWER",
    "assignments": [
      {
        "campaignId": "campaign_001",
        "positionIds": ["position_001"]
      }
    ]
  }
}
```

### Example — another interviewer

```http
GET /api/interviewers/u-int-content
Authorization: Bearer {{token:int-comms}}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "success": false,
  "message": "You cannot access this interviewer",
  "error": {
    "code": "FORBIDDEN"
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | An interviewer asks for another interviewer's profile. |
| `404` | `INTERVIEWER_NOT_FOUND` | No interviewer has that ID. |

## 4. Replace position assignments

**Endpoint:** `PUT /api/interviewers/{interviewerId}/positions`  
**Access:** Executive only  
**Content-Type:** `application/json`

Replaces the interviewer's position assignments for one campaign. Assignments
in other campaigns remain unchanged.

### Request body

| Field | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | Yes | The campaign that owns the positions. |
| `positionIds` | array of strings | Yes | Every position must belong to the specified campaign. An empty array removes all assignments for this campaign. |

### Example

```http
PUT /api/interviewers/u-int-content/positions
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "campaignId": "campaign_001",
  "positionIds": ["position_001", "position_003"]
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Interviewer positions updated successfully",
  "data": {
    "interviewerId": "u-int-content",
    "campaignId": "campaign_001",
    "positionIds": ["position_001", "position_003"]
  }
}
```

### Rules

1. The target user must have the `INTERVIEWER` role.
2. Every supplied position must belong to the specified campaign.
3. The operation replaces only the assignments for the supplied
   `campaignId`; assignments in other campaigns are preserved.
4. Assignments cannot be changed after the campaign schedule has been
   confirmed.
5. The operation must not silently remove an interviewer from an already
   confirmed interview.

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `campaignId` is missing, or `positionIds` is not an array. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `INTERVIEWER_NOT_FOUND` | No interviewer has that ID. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `404` | `POSITION_NOT_FOUND` | A supplied position does not belong to the campaign. |
| `409` | `INVALID_INTERVIEWER_ROLE` | The target user does not have the `INTERVIEWER` role. |
| `409` | `ASSIGNMENT_LOCKED` | The campaign schedule is confirmed, or the change would invalidate a confirmed interview. |

## 5. Read availability

**Endpoint:** `GET /api/interviewers/{interviewerId}/availability`  
**Access:** Executive or the interviewer accessing their own availability.

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

{
  "success": true,
  "data": [
    {
      "id": "availability_001",
      "interviewerId": "u-int-content",
      "campaignId": "campaign_001",
      "startTime": "2026-11-05T09:00:00+07:00",
      "endTime": "2026-11-05T11:00:00+07:00",
      "isAvailable": true
    },
    {
      "id": "availability_002",
      "interviewerId": "u-int-content",
      "campaignId": "campaign_001",
      "startTime": "2026-11-05T11:20:00+07:00",
      "endTime": "2026-11-05T12:00:00+07:00",
      "isAvailable": true
    }
  ]
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `campaignId` is missing. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | An interviewer asks for another interviewer's availability. |
| `404` | `INTERVIEWER_NOT_FOUND` | No interviewer has that ID. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |

## 6. Replace availability

**Endpoint:** `PUT /api/interviewers/{interviewerId}/availability`  
**Access:** Executive only  
**Content-Type:** `application/json`

Replaces all availability intervals for the specified interviewer and
campaign. Availability in other campaigns remains unchanged.

### Request body

| Field | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | Yes | The campaign. |
| `slots` | array | Yes | Non-overlapping `{startTime, endTime}` intervals inside the campaign interview date. An empty array removes all availability for this campaign, provided no confirmed interview would be invalidated. |

### Example

```http
PUT /api/interviewers/u-int-content/availability
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "campaignId": "campaign_001",
  "slots": [
    {
      "startTime": "2026-11-05T09:00:00+07:00",
      "endTime": "2026-11-05T11:00:00+07:00"
    },
    {
      "startTime": "2026-11-05T11:20:00+07:00",
      "endTime": "2026-11-05T12:00:00+07:00"
    }
  ]
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Interviewer availability updated successfully",
  "data": {
    "interviewerId": "u-int-content",
    "campaignId": "campaign_001",
    "slots": [
      {
        "id": "availability_001",
        "startTime": "2026-11-05T09:00:00+07:00",
        "endTime": "2026-11-05T11:00:00+07:00"
      },
      {
        "id": "availability_002",
        "startTime": "2026-11-05T11:20:00+07:00",
        "endTime": "2026-11-05T12:00:00+07:00"
      }
    ]
  }
}
```

### Rules

1. Every interval must have a valid ISO 8601 timestamp with timezone offset.
2. Every interval must fall on the campaign's `interviewDate`.
3. `startTime` must be before `endTime`.
4. Intervals in the same request must not overlap.
5. The replacement must be validated against confirmed interviews. It must
   not remove availability required by a confirmed interview.
6. The operation is allowed only before the campaign schedule is confirmed.

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A slot is malformed, `startTime` is not before `endTime`, a slot is outside the interview date, or supplied slots overlap. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `INTERVIEWER_NOT_FOUND` | No interviewer has that ID. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `409` | `AVAILABILITY_CONFLICT` | The replacement would invalidate a confirmed interview. |
| `409` | `SCHEDULE_ALREADY_CONFIRMED` | The campaign schedule is confirmed and availability is read-only. |

## 7. Get my position assignments

**Endpoint:** `GET /api/interviewers/me/assignments`  
**Access:** Interviewer only

The server identifies the interviewer from the bearer token.

### Example

```http
GET /api/interviewers/me/assignments
Authorization: Bearer {{token:int-comms}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "campaignId": "campaign_001",
      "campaignName": "Tuyển thành viên CLB Công nghệ thông tin 2026",
      "positions": [
        {
          "id": "position_002",
          "name": "Communications Officer",
          "department": "Ban Truyền thông"
        }
      ]
    },
    {
      "campaignId": "campaign_002",
      "campaignName": "Tuyển thành viên CLB Công nghệ thông tin 2025",
      "positions": [
        {
          "id": "position_101",
          "name": "Content Creator",
          "department": "Ban Nội dung"
        }
      ]
    }
  ]
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Interviewer. |

## 8. Get my interviews

**Endpoint:** `GET /api/interviewers/me/interviews`  
**Access:** Interviewer only

Returns interviews assigned to the authenticated interviewer. The result
includes interviews with status `CONFIRMED` or `COMPLETED`, so interviewers
can access past interviews when submitting or reviewing assessments.

Only interviews assigned to the caller are returned. The response must not
expose applications belonging to other interviewers.

| Query | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | No | Filter by campaign. |
| `date` | string | No | `YYYY-MM-DD`; filters by interview date. |
| `page` | integer | No | 1 or more; default 1. |
| `limit` | integer | No | 1–100; default 10. |

### Example

```http
GET /api/interviewers/me/interviews?campaignId=campaign_001&page=1&limit=10
Authorization: Bearer {{token:int-comms}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "id": "interview_002",
      "applicationId": "application_002",
      "campaignId": "campaign_001",
      "positionName": "Communications Officer",
      "applicant": {
        "fullName": "Lê Thu Hà",
        "studentId": "24120103"
      },
      "startTime": "2026-11-05T09:20:00+07:00",
      "endTime": "2026-11-05T09:40:00+07:00",
      "room": {
        "id": "room_a",
        "name": "Phòng A"
      },
      "status": "CONFIRMED"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | An invalid date or pagination value. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Interviewer. |

## 9. Common authorization rules

1. Only Executives can list all interviewers or change interviewer
   assignments and availability.
2. An Interviewer can read only their own profile, assignments, availability
   and assigned interviews.
3. An Interviewer can access an application only when it is attached to an
   interview assigned to them, subject to the Applications API authorization
   rules.
4. An Interviewer can submit or replace an assessment only for an interview
   assigned to them and only after that interview is marked `COMPLETED`.
5. The backend must enforce these restrictions. Hiding front-end controls
   does not replace authorization checks.

## 10. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added `campaignId` to position and availability operations, executable examples, and the read-only rule after confirmation. | Prevent cross-campaign assignments and make the interviewer workspace testable. |
| 2026-11-25 | Replaced flat `assignedPositionIds` with campaign-scoped `assignments`; added campaign filtering and route matching order; included completed interviews in the interviewer workspace. | Support interviewers assigned to multiple campaigns and keep the API consistent with campaign-specific scheduling and assessment workflows. |
