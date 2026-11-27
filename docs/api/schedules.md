# Schedules API

## 1. Overview

Manages interview scheduling for one recruitment campaign, including rooms,
draft generation, manual assignment, conflict detection, conflict resolution,
saving, confirmation and export.

A schedule is editable while its campaign is in the scheduling workflow.
After the campaign is confirmed, interview assignments become read-only.
However, interview execution status can still change from `CONFIRMED` to
`COMPLETED` so that Interviewers can submit assessments.

Base path: `/api`.

### Entry statuses

| Status | Meaning |
|---|---|
| `PROPOSED` | A valid draft assignment that has not been confirmed. |
| `UNASSIGNED` | No valid slot/interviewer/room combination; `reason` explains why. |
| `CONFLICT` | The assignment overlaps another entry for the applicant, interviewer or room; `conflictWith` identifies the other entries. |
| `CONFIRMED` | The campaign schedule has been confirmed; assignment details are read-only. |
| `COMPLETED` | The interview has taken place. Assignment details remain read-only. |

### Schedule object

| Field | Type | Rules |
|---|---|---|
| `campaignId` | string | The campaign. |
| `date` | string | `YYYY-MM-DD`; must match the campaign interview date. |
| `startTime` | string | `HH:mm`; schedule window start. |
| `endTime` | string | `HH:mm`; schedule window end. |
| `slotDuration` | integer | 15, 20 or 30 minutes. |
| `status` | string | `DRAFT` or `CONFIRMED`. |
| `entries` | array | One entry per shortlisted application. |
| `summary` | object | Computed from entries; see below. |

### Schedule summary

| Field | Type | Rules |
|---|---|---|
| `total` | integer | Total number of schedule entries. |
| `proposed` | integer | Number of `PROPOSED` entries. |
| `conflict` | integer | Number of `CONFLICT` entries. |
| `unassigned` | integer | Number of `UNASSIGNED` entries. |
| `confirmed` | integer | Number of `CONFIRMED` entries. |
| `completed` | integer | Number of `COMPLETED` entries. |

All summary values must be calculated from the actual entries. They must
never be hardcoded independently of the schedule data.

### Entry object

| Field | Type | Rules |
|---|---|---|
| `id` | string | Server-generated interview ID, e.g. `interview_001`. |
| `applicationId` | string | The application being interviewed. |
| `applicationCode` | string | Human-readable code such as `A01`. |
| `applicantName` | string | Applicant display name. |
| `positionId` | string | Position applied for. |
| `positionName` | string | Position display name. |
| `interviewer` | object or null | `{id, fullName}` or `null` when unassigned. |
| `room` | object or null | `{id, name}` or `null` when unassigned. |
| `startTime` | string or null | ISO 8601 timestamp with timezone offset, or `null` when unassigned. |
| `endTime` | string or null | ISO 8601 timestamp with timezone offset, or `null` when unassigned. |
| `status` | string | One of the entry statuses above. |
| `reason` | string or null | Required for `UNASSIGNED`. |
| `conflictWith` | array of strings | IDs of all overlapping entries; empty when none. |
| `conflictReason` | string or null | Required for `CONFLICT`. |

### Scheduling rules

1. Only `SHORTLISTED` applications can enter the schedule.
2. Each application can have at most one interview.
3. Each interview must have exactly one assigned interviewer and one room
   before it can be confirmed.
4. The interviewer must be assigned to the relevant position.
5. The applicant, interviewer and room must all be available for the
   assigned interval.
6. Each room can host only one interview at a time.
7. An applicant cannot attend two overlapping interviews.
8. An interviewer cannot conduct two overlapping interviews.
9. Two interviews that end and start at the same time do not overlap.
   For example, 09:00–09:20 and 09:20–09:40 are valid consecutive slots.
10. A real conflict must identify the overlapping entry and the resource
    causing the conflict.
11. Applications that cannot be scheduled must remain `UNASSIGNED` with
    a specific reason. They must not be automatically rejected.
12. Schedule generation must not create duplicate interviews for an
    application that already has an entry.

## 2. List rooms

**Endpoint:** `GET /api/rooms`  
**Access:** Executive only

Returns the existing rooms available for interview scheduling.

### Example

```http
GET /api/rooms
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "id": "room_a",
      "name": "Phòng A",
      "location": "Tầng 2 (Media Lab)"
    },
    {
      "id": "room_b",
      "name": "Phòng B",
      "location": "Tầng 2 (Phòng họp)"
    },
    {
      "id": "room_c",
      "name": "Phòng C",
      "location": "Tầng 3 (Phòng Kỹ thuật)"
    }
  ]
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |

## 3. Read the schedule

**Endpoint:** `GET /api/campaigns/{campaignId}/schedule`  
**Access:** Executive only

Returns the current draft or confirmed schedule, including all shortlisted
applications and their assignment statuses.

### Example

```http
GET /api/campaigns/campaign_001/schedule
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "campaignId": "campaign_001",
    "date": "2026-11-05",
    "startTime": "09:00",
    "endTime": "12:00",
    "slotDuration": 20,
    "status": "DRAFT",
    "entries": [
      {
        "id": "interview_001",
        "applicationId": "application_001",
        "applicationCode": "A01",
        "applicantName": "Nguyễn Minh Anh",
        "positionId": "position_001",
        "positionName": "Content Creator",
        "interviewer": {
          "id": "u-int-content",
          "fullName": "Phan Minh Đức"
        },
        "room": {
          "id": "room_a",
          "name": "Phòng A"
        },
        "startTime": "2026-11-05T09:00:00+07:00",
        "endTime": "2026-11-05T09:20:00+07:00",
        "status": "CONFLICT",
        "reason": null,
        "conflictWith": ["interview_002"],
        "conflictReason": "Applicant Nguyễn Minh Anh also has interview_002 at the same time."
      },
      {
        "id": "interview_002",
        "applicationId": "application_002",
        "applicationCode": "A02",
        "applicantName": "Nguyễn Minh Anh",
        "positionId": "position_002",
        "positionName": "Communications Officer",
        "interviewer": {
          "id": "u-int-comms",
          "fullName": "Trần Thanh Tùng"
        },
        "room": {
          "id": "room_c",
          "name": "Phòng C"
        },
        "startTime": "2026-11-05T09:00:00+07:00",
        "endTime": "2026-11-05T09:20:00+07:00",
        "status": "CONFLICT",
        "reason": null,
        "conflictWith": ["interview_001"],
        "conflictReason": "Applicant Nguyễn Minh Anh also has interview_001 at the same time."
      },
      {
        "id": "interview_003",
        "applicationId": "application_003",
        "applicationCode": "A03",
        "applicantName": "Lê Thu Hà",
        "positionId": "position_002",
        "positionName": "Communications Officer",
        "interviewer": {
          "id": "u-int-comms",
          "fullName": "Trần Thanh Tùng"
        },
        "room": {
          "id": "room_b",
          "name": "Phòng B"
        },
        "startTime": "2026-11-05T09:20:00+07:00",
        "endTime": "2026-11-05T09:40:00+07:00",
        "status": "PROPOSED",
        "reason": null,
        "conflictWith": [],
        "conflictReason": null
      },
      {
        "id": "interview_004",
        "applicationId": "application_004",
        "applicationCode": "A04",
        "applicantName": "Phạm Quốc Bảo",
        "positionId": "position_001",
        "positionName": "Content Creator",
        "interviewer": {
          "id": "u-int-content",
          "fullName": "Phan Minh Đức"
        },
        "room": {
          "id": "room_a",
          "name": "Phòng A"
        },
        "startTime": "2026-11-05T09:20:00+07:00",
        "endTime": "2026-11-05T09:40:00+07:00",
        "status": "PROPOSED",
        "reason": null,
        "conflictWith": [],
        "conflictReason": null
      },
      {
        "id": "interview_005",
        "applicationId": "application_005",
        "applicationCode": "A05",
        "applicantName": "Đỗ Đức Thắng",
        "positionId": "position_003",
        "positionName": "Technical Member",
        "interviewer": null,
        "room": null,
        "startTime": null,
        "endTime": null,
        "status": "UNASSIGNED",
        "reason": "No common availability: the applicant is available 09:00–09:20, while the qualified interviewer Ngô Ngọc Yến is available 10:00–10:20.",
        "conflictWith": [],
        "conflictReason": null
      },
      {
        "id": "interview_006",
        "applicationId": "application_006",
        "applicationCode": "A06",
        "applicantName": "Vũ Hoàng Long",
        "positionId": "position_003",
        "positionName": "Technical Member",
        "interviewer": {
          "id": "u-int-tech",
          "fullName": "Ngô Ngọc Yến"
        },
        "room": {
          "id": "room_c",
          "name": "Phòng C"
        },
        "startTime": "2026-11-05T10:20:00+07:00",
        "endTime": "2026-11-05T10:40:00+07:00",
        "status": "PROPOSED",
        "reason": null,
        "conflictWith": [],
        "conflictReason": null
      }
    ],
    "summary": {
      "total": 6,
      "proposed": 3,
      "conflict": 2,
      "unassigned": 1,
      "confirmed": 0,
      "completed": 0
    }
  }
}
```

The example contains six shortlisted applications, matching the
`campaign_001` statistics in `applications.md`.

The two conflict entries overlap because they belong to the same Applicant
and occupy the same interval. The other entries do not overlap their
respective applicants, interviewers or rooms.

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `404` | `SCHEDULE_NOT_FOUND` | No schedule has been generated for the campaign. |

## 4. Generate a draft schedule

**Endpoint:** `POST /api/campaigns/{campaignId}/schedule/generate`  
**Access:** Executive only  
**Content-Type:** `application/json`

### Request body

| Field | Type | Required | Rules |
|---|---|---:|---|
| `date` | string | Yes | Must match the campaign interview date. |
| `startTime` | string | Yes | `HH:mm`. |
| `endTime` | string | Yes | `HH:mm`, after `startTime`. |
| `slotDuration` | integer | Yes | 15, 20 or 30. |

Only `SHORTLISTED` applications enter the draft. The generator sequentially
selects the first available combination of time slot, qualified interviewer
and room.

Applications without a valid combination remain `UNASSIGNED` with a
specific reason. Actual overlaps are marked `CONFLICT`.

The generator must create at most one interview entry per shortlisted
application. If a draft already exists, regeneration replaces its draft
assignments rather than creating duplicate entries.

### Example

```http
POST /api/campaigns/campaign_001/schedule/generate
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "date": "2026-11-05",
  "startTime": "09:00",
  "endTime": "12:00",
  "slotDuration": 20
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Draft schedule generated",
  "data": {
    "campaignId": "campaign_001",
    "date": "2026-11-05",
    "startTime": "09:00",
    "endTime": "12:00",
    "slotDuration": 20,
    "status": "DRAFT",
    "summary": {
      "total": 6,
      "proposed": 3,
      "conflict": 2,
      "unassigned": 1,
      "confirmed": 0,
      "completed": 0
    }
  }
}
```

The generated entries follow the same entry structure and sample data shown
in Section 3.

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | The date/window is invalid, `slotDuration` is not 15/20/30, or no shortlisted applications exist. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `409` | `CAMPAIGN_NOT_CLOSED` | The application period has not closed. |
| `409` | `SCHEDULE_ALREADY_CONFIRMED` | The campaign schedule is already confirmed. |

## 5. Edit one entry

**Endpoint:** `PATCH /api/campaigns/{campaignId}/schedule/entries/{entryId}`  
**Access:** Executive only  
**Content-Type:** `application/json`

Updates the assignment of one entry in a draft schedule.

### Request body

| Field | Type | Required | Rules |
|---|---|---:|---|
| `startTime` | string | No | ISO 8601 with timezone offset; must remain within the campaign interview date and schedule window. |
| `endTime` | string | No | ISO 8601 with timezone offset; must be after `startTime`. |
| `interviewerId` | string | No | Must be qualified for the position and available. |
| `roomId` | string | No | Must be available for the interval. |

The backend must validate the applicant, interviewer and room availability
after the proposed edit.

An edit that would create a new conflict is rejected with `409 SCHEDULE_CONFLICT`.
The existing schedule remains unchanged.

When an existing conflict is resolved, the backend must recalculate the
statuses and conflict references of all affected entries. It must not leave
stale conflict information on either entry.

### Example

```http
PATCH /api/campaigns/campaign_001/schedule/entries/interview_003
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "startTime": "2026-11-05T10:00:00+07:00",
  "endTime": "2026-11-05T10:20:00+07:00"
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Schedule entry updated",
  "data": {
    "id": "interview_003",
    "applicationId": "application_003",
    "applicationCode": "A03",
    "applicantName": "Lê Thu Hà",
    "positionId": "position_002",
    "positionName": "Communications Officer",
    "interviewer": {
      "id": "u-int-comms",
      "fullName": "Trần Thanh Tùng"
    },
    "room": {
      "id": "room_b",
      "name": "Phòng B"
    },
    "startTime": "2026-11-05T10:00:00+07:00",
    "endTime": "2026-11-05T10:20:00+07:00",
    "status": "PROPOSED",
    "reason": null,
    "conflictWith": [],
    "conflictReason": null
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A time is malformed or outside the schedule window. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `404` | `ENTRY_NOT_FOUND` | No schedule entry has that ID. |
| `409` | `SCHEDULE_CONFLICT` | The change would overlap the applicant, interviewer or room. |
| `409` | `SCHEDULE_ALREADY_CONFIRMED` | The campaign schedule is confirmed and assignment details are read-only. |

## 6. Resolve one conflict

**Endpoint:** `POST /api/campaigns/{campaignId}/schedule/entries/{entryId}/resolve`  
**Access:** Executive only

Moves the selected conflicting entry to the first available slot that
preserves its qualified interviewer and room.

After moving the entry, the backend must recalculate conflict status for
both the moved entry and every affected entry.

For example, resolving `interview_001` moves it from 09:00–09:20 to
09:40–10:00. This removes its applicant overlap with `interview_002`.
If no other conflicts remain, both entries become `PROPOSED` and their
`conflictWith` arrays become empty.

The schedule summary must also be recalculated.

### Example

```http
POST /api/campaigns/campaign_001/schedule/entries/interview_001/resolve
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Conflict resolved",
  "data": {
    "updatedEntries": [
      {
        "id": "interview_001",
        "applicationId": "application_001",
        "applicationCode": "A01",
        "applicantName": "Nguyễn Minh Anh",
        "positionId": "position_001",
        "positionName": "Content Creator",
        "interviewer": {
          "id": "u-int-content",
          "fullName": "Phan Minh Đức"
        },
        "room": {
          "id": "room_a",
          "name": "Phòng A"
        },
        "startTime": "2026-11-05T09:40:00+07:00",
        "endTime": "2026-11-05T10:00:00+07:00",
        "status": "PROPOSED",
        "reason": null,
        "conflictWith": [],
        "conflictReason": null
      },
      {
        "id": "interview_002",
        "applicationId": "application_002",
        "applicationCode": "A02",
        "applicantName": "Nguyễn Minh Anh",
        "positionId": "position_002",
        "positionName": "Communications Officer",
        "interviewer": {
          "id": "u-int-comms",
          "fullName": "Trần Thanh Tùng"
        },
        "room": {
          "id": "room_c",
          "name": "Phòng C"
        },
        "startTime": "2026-11-05T09:00:00+07:00",
        "endTime": "2026-11-05T09:20:00+07:00",
        "status": "PROPOSED",
        "reason": null,
        "conflictWith": [],
        "conflictReason": null
      }
    ],
    "summary": {
      "total": 6,
      "proposed": 5,
      "conflict": 0,
      "unassigned": 1,
      "confirmed": 0,
      "completed": 0
    }
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `404` | `ENTRY_NOT_FOUND` | No schedule entry has that ID. |
| `409` | `NO_AVAILABLE_SLOT` | No valid slot remains for the entry. |
| `409` | `SCHEDULE_ALREADY_CONFIRMED` | The campaign schedule is confirmed. |

## 7. Assign a slot manually

**Endpoint:** `POST /api/campaigns/{campaignId}/schedule/entries`  
**Access:** Executive only  
**Content-Type:** `application/json`

Creates an interview entry for a shortlisted application that does not
already have one.

If the application already has an `UNASSIGNED` entry, the request must
update that entry instead of creating a duplicate. Its existing interview
ID is preserved.

### Request body

| Field | Type | Required | Rules |
|---|---|---:|---|
| `applicationId` | string | Yes | A shortlisted application belonging to the campaign. |
| `startTime` | string | Yes | ISO 8601 with timezone offset. |
| `endTime` | string | Yes | ISO 8601 with timezone offset; after `startTime`. |
| `interviewerId` | string | Yes | Must be qualified and available. |
| `roomId` | string | Yes | Must be available for the interval. |

### Example

```http
POST /api/campaigns/campaign_001/schedule/entries
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "applicationId": "application_005",
  "startTime": "2026-11-05T10:00:00+07:00",
  "endTime": "2026-11-05T10:20:00+07:00",
  "interviewerId": "u-int-tech",
  "roomId": "room_c"
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Unassigned entry updated",
  "data": {
    "id": "interview_005",
    "applicationId": "application_005",
    "applicationCode": "A05",
    "applicantName": "Đỗ Đức Thắng",
    "positionId": "position_003",
    "positionName": "Technical Member",
    "interviewer": {
      "id": "u-int-tech",
      "fullName": "Ngô Ngọc Yến"
    },
    "room": {
      "id": "room_c",
      "name": "Phòng C"
    },
    "startTime": "2026-11-05T10:00:00+07:00",
    "endTime": "2026-11-05T10:20:00+07:00",
    "status": "PROPOSED",
    "reason": null,
    "conflictWith": [],
    "conflictReason": null
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A field is missing, malformed or outside the schedule window. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `404` | `APPLICATION_NOT_FOUND` | The application does not exist. |
| `409` | `APPLICATION_NOT_SHORTLISTED` | The application is not shortlisted. |
| `409` | `APPLICATION_ALREADY_SCHEDULED` | The application already has a non-UNASSIGNED interview entry. |
| `409` | `INTERVIEWER_NOT_QUALIFIED` | The interviewer is not assigned to the position. |
| `409` | `SCHEDULE_CONFLICT` | The proposed slot overlaps the applicant, interviewer or room. |
| `409` | `SCHEDULE_ALREADY_CONFIRMED` | The campaign schedule is confirmed. |

## 8. Save the draft

**Endpoint:** `PUT /api/campaigns/{campaignId}/schedule`  
**Access:** Executive only  
**Content-Type:** `application/json`

Saves the current in-memory draft schedule. The request body may be empty.
Saving never confirms the schedule.

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

{
  "success": true,
  "message": "Schedule saved",
  "data": {
    "campaignId": "campaign_001",
    "status": "DRAFT",
    "savedAt": "2026-11-05T12:00:00+07:00"
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `409` | `SCHEDULE_ALREADY_CONFIRMED` | The campaign schedule is confirmed. |

## 9. Export the schedule

**Endpoint:** `GET /api/campaigns/{campaignId}/schedule/export`  
**Access:** Executive only

Returns a CSV attachment with one row per schedule entry, including
application code, applicant, position, interviewer, room, time and status.

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

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `404` | `SCHEDULE_NOT_FOUND` | No schedule exists for the campaign. |

## 10. Mark an interview as completed

**Endpoint:** `POST /api/campaigns/{campaignId}/schedule/entries/{entryId}/complete`  
**Access:** Assigned Interviewer or Executive

Marks an interview as completed after the interview has actually taken place.

This operation changes only the interview execution status. It does not
modify the confirmed date, time, interviewer or room.

### Rules

1. The campaign schedule must already be confirmed.
2. The entry must have status `CONFIRMED`.
3. The authenticated Interviewer must be assigned to the entry.
4. An Executive may also mark the interview as completed.
5. The interview must have reached its scheduled end time before it can
   be marked completed.
6. The operation changes the entry status to `COMPLETED`.
7. A completed interview cannot return to `CONFIRMED`.
8. Marking an interview completed does not automatically create an
   assessment. The assigned Interviewer must submit the assessment through
   `assessments.md`.

### Example

```http
POST /api/campaigns/campaign_001/schedule/entries/interview_001/complete
Authorization: Bearer {{token:int-content}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Interview marked as completed",
  "data": {
    "id": "interview_001",
    "applicationId": "application_001",
    "applicationCode": "A01",
    "status": "COMPLETED",
    "startTime": "2026-11-05T09:00:00+07:00",
    "endTime": "2026-11-05T09:20:00+07:00",
    "interviewer": {
      "id": "u-int-content",
      "fullName": "Phan Minh Đức"
    },
    "room": {
      "id": "room_a",
      "name": "Phòng A"
    }
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not the assigned Interviewer or an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `404` | `ENTRY_NOT_FOUND` | No schedule entry has that ID. |
| `409` | `SCHEDULE_NOT_CONFIRMED` | The campaign schedule has not been confirmed. |
| `409` | `INTERVIEW_NOT_STARTED` | The scheduled end time has not passed. |
| `409` | `INTERVIEW_ALREADY_COMPLETED` | The interview is already completed. |

## 11. Confirmation and post-confirmation behavior

The schedule confirmation operation belongs to the Campaigns API:

`POST /api/campaigns/{campaignId}/confirm`

Before confirmation, the Campaigns API must verify:

1. The campaign application period has closed.
2. All applications have been reviewed.
3. Every shortlisted application has exactly one valid interview entry.
4. No entries remain `UNASSIGNED`.
5. No entries remain `CONFLICT`.
6. Every interview has an assigned qualified interviewer.
7. Every interview has an available room.
8. All applicant, interviewer and room overlaps have been resolved.

After successful confirmation:

- The campaign status becomes `CONFIRMED`.
- The schedule status becomes `CONFIRMED`.
- All `PROPOSED` entries become `CONFIRMED`.
- Schedule generation, editing, conflict resolution and manual assignment
  are disabled.
- Campaign configuration and application records become read-only.
- Applicants can view only their own confirmed interview schedules.
- Interviewers can view only their assigned confirmed interviews.
- Assigned Interviewers can still mark their interviews as `COMPLETED`.
- Interviewers can submit assessments for completed interviews.
- Executives can record and publish final results.
- The campaign moves to `COMPLETED` only through
  `POST /api/campaigns/{campaignId}/complete`, after every interview is
  `COMPLETED` and every final result is recorded and published.

The schedule confirmation process must not prevent post-interview
assessments or final recruitment decisions.

## 12. Cross-API dependencies

| Related API | Dependency |
|---|---|
| `campaigns.md` | Provides campaign interview date, rooms/slot configuration, campaign status, schedule confirmation and the campaign completion transition. |
| `applications.md` | Provides application ownership, `applicationCode` and screening status. Only shortlisted applications enter scheduling. |
| `interviewers.md` | Provides campaign-scoped position assignments and interviewer availability. |
| `assessments.md` | Requires an interview with status `COMPLETED` before assessment submission. |
| `results.md` | Requires a completed interview and submitted assessment before recording a final result. |
| `auth.md` | Provides authenticated user identity and role-based access control. |

### Shared data consistency

- `interview_001` belongs to `application_001` (`A01`) and is assigned to
  `u-int-content`.
- `interview_002` belongs to `application_002` (`A02`) and is assigned to
  `u-int-comms`.
- `interview_003` belongs to `application_003` (`A03`) and is assigned to
  `u-int-comms`.
- `interview_004` belongs to `application_004` (`A04`) and is assigned to
  `u-int-content`.
- `interview_005` belongs to `application_005` (`A05`) and is initially
  unassigned.
- `interview_006` belongs to `application_006` (`A06`) and is assigned to
  `u-int-tech`.
- The six entries correspond to the six shortlisted applications in
  `campaign_001`.

## 13. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added the schedule resource, rooms, conflict details, manual assignment and export. | Cover C4, C8 and C9 with Proposed/Unassigned/Conflict data. |
| 2026-11-25 | Added the sixth shortlisted application entry and aligned sample IDs with other API contracts. | Ensure consistent campaign statistics and shared data. |
| 2026-11-25 | Standardized entry routes under `/api/campaigns/{campaignId}/schedule/entries`. | Keep route naming consistent. |
| 2026-11-25 | Added two-sided conflict recalculation and automatic summary updates. | Prevent stale conflict states and incorrect schedule counts. |
| 2026-11-25 | Added the interview completion operation and post-confirmation lifecycle rules. | Support assessment submission and final result workflows. |
| 2026-11-25 | Added authorization errors and clarified schedule immutability after confirmation. | Align with C1, C8, C9 and C11. |
