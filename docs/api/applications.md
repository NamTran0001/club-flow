# Applications API

## 1. Overview

Application submission, personal tracking and Executive CV screening.

Base path: `/api`.

### Application statuses

| Status | Meaning |
|---|---|
| `PENDING` | Submitted and waiting for CV screening. |
| `SHORTLISTED` | Passed CV screening; eligible for interview scheduling. |
| `REJECTED` | Failed CV screening; never enters scheduling. |

Interview state and final results are separate resources. `SHORTLISTED` is not an acceptance and does not mean an interview is already confirmed.

### Application rules

1. Only an authenticated Applicant may submit an application.
2. One application per position per campaign. A student may apply for several different positions; each is a separate application.
3. A duplicate submission returns `409 APPLICATION_ALREADY_EXISTS` with the existing application ID. The Frontend must use that ID to open the existing application instead of treating the response as an ordinary submission failure.
4. A CV must be a PDF of at most 5 MB.
5. A motivation statement is at most 300 words.
6. Applications are accepted only while the campaign is `OPEN` and the submission time is inside the campaign's application period.
7. Applicants read only their own applications. Executives read all applications in a campaign. An interviewer reads only an application attached to an interview assigned to them.
8. Internal screening notes are never included in an Applicant or Interviewer response.
9. Applicants must select at least one interview slot when submitting an application.
10. Every selected slot must exist and belong to the specified campaign.
11. Duplicate slot IDs in `availabilitySlotIds` are not allowed.
12. Interview slots are configured by Executives while the campaign is `DRAFT`. Applicants can retrieve configured slots through `GET /api/campaigns/{campaignId}/slots`.
13. Once a campaign is `OPEN`, its interview slots are read-only. This prevents changes from invalidating availability selections already submitted by Applicants.
14. `availabilitySlotIds` represents the Applicant's availability preferences. It does not represent a confirmed interview appointment.
15. A confirmed interview appointment is returned in the `interview` field of Applicant tracking responses. This field is `null` until the interview schedule has been confirmed.
16. Every application resource returned by this API includes an `applicationCode`, a human-readable identifier such as `A01`. The database/application ID remains the value used in API paths.

### Route declaration order

When implementing these endpoints with Express, register static routes before routes containing dynamic parameters:

1. `GET /api/applications/me`
2. `GET /api/applications/statistics`
3. `GET /api/applications/export`
4. `GET /api/applications`
5. `GET /api/applications/:applicationId/cv`
6. `GET /api/applications/:applicationId`
7. Other routes containing `:applicationId`

This prevents Express from interpreting static path segments such as `me`, `statistics` or `export` as an `applicationId`.

## 2. Submit an application

**Endpoint:** `POST /api/applications`  
**Access:** Applicant only  
**Content-Type:** `multipart/form-data`

### Request fields

| Field | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | Yes | Must exist and be `OPEN`. |
| `positionId` | string | Yes | Must belong to the campaign. |
| `studentId` | string | Yes | 4–20 characters. |
| `fullName` | string | Yes | 1–150 characters. |
| `email` | string | Yes | A valid e-mail address. |
| `phone` | string | Yes | 8–20 characters. |
| `cv` | file | Yes | PDF only, at most 5 MB. |
| `motivationStatement` | string | Yes | At most 300 words. |
| `availabilitySlotIds` | string | Yes | JSON array containing at least one valid interview slot ID from `GET /api/campaigns/{campaignId}/slots`. |

### Interview slot validation

The server must validate `availabilitySlotIds` before creating the application.

1. The field must contain a valid JSON array of strings.
2. The array must contain at least one slot ID.
3. Every slot ID must exist.
4. Every slot must belong to the campaign specified by `campaignId`.
5. Duplicate slot IDs are not allowed.
6. All selected slots must belong to the campaign's configured interview date.
7. Slots must be selectable for the campaign. Slots from another campaign or nonexistent slots are rejected.
8. The server must not accept arbitrary slot IDs supplied by the client without checking the database.

If any selected slot is invalid, the entire application submission is rejected. No partial application is created.

### Duplicate application handling

If the Applicant has already applied for the same position in the same campaign:

- The server must not create another application.
- The server returns `409 APPLICATION_ALREADY_EXISTS`.
- The response includes `existingApplicationId` and `existingApplicationCode`.
- The Frontend must navigate to or display the existing application using `existingApplicationId`.

This behavior satisfies the requirement that a duplicate submission opens the existing application instead of creating another record.

### Example — duplicate application

```sh
curl -i http://localhost:3001/api/applications \
  -H "Authorization: Bearer {{token:studentA}}" \
  -F campaignId=campaign_001 \
  -F positionId=position_001 \
  -F studentId=24120101 \
  -F "fullName=Nguyễn Minh Anh" \
  -F email=studenta@clubflow.test \
  -F phone=0901234567 \
  -F "cv=@{{file:cv.pdf:1MB}};type=application/pdf" \
  -F "motivationStatement=Em muốn tham gia câu lạc bộ." \
  -F 'availabilitySlotIds=["slot_001","slot_002"]'
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "success": false,
  "message": "You have already applied for this position. Open the existing application.",
  "error": {
    "code": "APPLICATION_ALREADY_EXISTS",
    "existingApplicationId": "application_001",
    "existingApplicationCode": "A01"
  }
}
```

### Example — successful submission for another position

```sh
curl -i http://localhost:3001/api/applications \
  -H "Authorization: Bearer {{token:studentA}}" \
  -F campaignId=campaign_001 \
  -F positionId=position_003 \
  -F studentId=24120101 \
  -F "fullName=Nguyễn Minh Anh" \
  -F email=studenta@clubflow.test \
  -F phone=0901234567 \
  -F "cv=@{{file:cv.pdf:1MB}};type=application/pdf" \
  -F "motivationStatement=Em muốn tham gia Ban Kỹ thuật." \
  -F 'availabilitySlotIds=["slot_001","slot_002"]'
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "id": "application_009",
    "applicationCode": "A09",
    "campaignId": "campaign_001",
    "positionId": "position_003",
    "applicantId": "u-studentA",
    "status": "PENDING",
    "submittedAt": "2026-10-18T10:15:00+07:00"
  }
}
```

### Example — invalid interview slot

```sh
curl -i http://localhost:3001/api/applications \
  -H "Authorization: Bearer {{token:studentA}}" \
  -F campaignId=campaign_001 \
  -F positionId=position_003 \
  -F studentId=24120101 \
  -F "fullName=Nguyễn Minh Anh" \
  -F email=studenta@clubflow.test \
  -F phone=0901234567 \
  -F "cv=@{{file:cv.pdf:1MB}};type=application/pdf" \
  -F "motivationStatement=Em muốn tham gia Ban Kỹ thuật." \
  -F 'availabilitySlotIds=["slot_001","invalid_slot"]'
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "availabilitySlotIds": "One or more interview slots do not exist or do not belong to this campaign."
    }
  }
}
```

### Example — empty availability slots

```sh
curl -i http://localhost:3001/api/applications \
  -H "Authorization: Bearer {{token:studentA}}" \
  -F campaignId=campaign_001 \
  -F positionId=position_003 \
  -F studentId=24120101 \
  -F "fullName=Nguyễn Minh Anh" \
  -F email=studenta@clubflow.test \
  -F phone=0901234567 \
  -F "cv=@{{file:cv.pdf:1MB}};type=application/pdf" \
  -F "motivationStatement=Em muốn tham gia Ban Kỹ thuật." \
  -F 'availabilitySlotIds=[]'
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "availabilitySlotIds": "At least one interview slot must be selected."
    }
  }
}
```

### Example — not a PDF

```sh
curl -i http://localhost:3001/api/applications \
  -H "Authorization: Bearer {{token:studentA}}" \
  -F campaignId=campaign_001 \
  -F positionId=position_003 \
  -F studentId=24120101 \
  -F "fullName=Nguyễn Minh Anh" \
  -F email=studenta@clubflow.test \
  -F phone=0901234567 \
  -F "cv=@{{file:cv.txt:1KB}};type=text/plain" \
  -F "motivationStatement=Em muốn tham gia." \
  -F 'availabilitySlotIds=["slot_001"]'
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "message": "CV must be a PDF file",
  "error": {
    "code": "INVALID_CV_FORMAT"
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A field is missing or outside its limit, or `availabilitySlotIds` is malformed, empty, duplicated or contains invalid slot references. |
| `400` | `INVALID_CV_FORMAT` | The uploaded file is not a PDF. |
| `400` | `CV_TOO_LARGE` | The PDF is larger than 5 MB. |
| `400` | `MOTIVATION_TOO_LONG` | The statement is longer than 300 words. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Applicant. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `404` | `POSITION_NOT_FOUND` | The position does not belong to the campaign. |
| `409` | `CAMPAIGN_CLOSED` | The campaign is not open or the application period is over. |
| `409` | `APPLICATION_ALREADY_EXISTS` | The same Applicant already has an application for this position in this campaign. The response includes the existing application ID and code. |

### Example — closed campaign

```sh
curl -i http://localhost:3001/api/applications \
  -H "Authorization: Bearer {{token:studentA}}" \
  -F campaignId=campaign_002 \
  -F positionId=position_101 \
  -F studentId=24120101 \
  -F "fullName=Nguyễn Minh Anh" \
  -F email=studenta@clubflow.test \
  -F phone=0901234567 \
  -F "cv=@{{file:cv.pdf:1MB}};type=application/pdf" \
  -F "motivationStatement=Em muốn tham gia." \
  -F 'availabilitySlotIds=["slot_101"]'
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "success": false,
  "message": "The campaign is not accepting applications",
  "error": {
    "code": "CAMPAIGN_CLOSED"
  }
}
```

## 3. Get my applications

**Endpoint:** `GET /api/applications/me`  
**Access:** Applicant only

Returns applications belonging to the authenticated Applicant. The server identifies the Applicant from the token and never accepts an `applicantId` from the client.

| Query | Type | Required | Rules |
|---|---|---:|---|
| `status` | string | No | `PENDING`, `SHORTLISTED` or `REJECTED`. |
| `page` | integer | No | 1 or more; default 1. |
| `limit` | integer | No | 1–100; default 10. |

### Confirmed interview information

Each application includes an `interview` field:

- `null` if the campaign's interview schedule has not been confirmed.
- An interview object if the Applicant has a confirmed interview appointment.

The interview object contains the confirmed date, start time, end time and room. It represents the Applicant's actual assigned appointment, not the availability slots selected during application submission.

The `room` field is an object with the same shape used by the Schedules and Interviewers APIs: `{"id": "room_a", "name": "Phòng A"}`. It is never a plain string.

The interview `status` is `CONFIRMED` before the interview takes place and `COMPLETED` afterwards. The appointment details remain visible in both cases.

### Example — application without a confirmed interview

```http
GET /api/applications/me?status=PENDING&page=1&limit=10
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "id": "application_009",
      "applicationCode": "A09",
      "campaignId": "campaign_001",
      "campaignName": "Tuyển thành viên CLB Công nghệ thông tin 2026",
      "positionId": "position_003",
      "positionName": "Technical Member",
      "studentId": "24120101",
      "fullName": "Nguyễn Minh Anh",
      "email": "studenta@clubflow.test",
      "status": "PENDING",
      "submittedAt": "2026-10-18T10:15:00+07:00",
      "interview": null
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

### Example — application with a confirmed interview

```http
GET /api/applications/me?status=SHORTLISTED&page=1&limit=10
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "id": "application_001",
      "applicationCode": "A01",
      "campaignId": "campaign_001",
      "campaignName": "Tuyển thành viên CLB Công nghệ thông tin 2026",
      "positionId": "position_001",
      "positionName": "Content Creator",
      "studentId": "24120101",
      "fullName": "Nguyễn Minh Anh",
      "email": "studenta@clubflow.test",
      "status": "SHORTLISTED",
      "submittedAt": "2026-10-18T09:15:00+07:00",
      "interview": {
        "id": "interview_001",
        "status": "CONFIRMED",
        "startTime": "2026-11-05T09:00:00+07:00",
        "endTime": "2026-11-05T09:20:00+07:00",
        "room": {
          "id": "room_a",
          "name": "Phòng A"
        }
      }
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
| `400` | `VALIDATION_ERROR` | An invalid status or pagination value. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Applicant. |

## 4. Get one application

**Endpoint:** `GET /api/applications/{applicationId}`  
**Access:** Applicant own · Executive · Interviewer assigned

The Applicant can retrieve only their own application. An Interviewer can retrieve only an application attached to an interview assigned to them.

The response always includes `applicationCode`.

The Applicant and Interviewer responses omit `internalNotes`. The Executive response includes `internalNotes`.

The `interview` field follows the same rule as `GET /api/applications/me`: it is `null` until a confirmed interview appointment exists. Once confirmed, it contains the Applicant's assigned date, time and room.

### Example — Applicant's own application

```http
GET /api/applications/application_001
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "application_001",
    "applicationCode": "A01",
    "campaignId": "campaign_001",
    "campaignName": "Tuyển thành viên CLB Công nghệ thông tin 2026",
    "positionId": "position_001",
    "positionName": "Content Creator",
    "studentId": "24120101",
    "fullName": "Nguyễn Minh Anh",
    "email": "studenta@clubflow.test",
    "phone": "0901234567",
    "cvUrl": "/api/applications/application_001/cv",
    "cvFileName": "A01-NguyenMinhAnh-CV.pdf",
    "cvSizeBytes": 1468006,
    "motivationStatement": "Em đã có kinh nghiệm quản lý fanpage học thuật và mong muốn tham gia Ban Nội dung.",
    "availabilitySlotIds": ["slot_001", "slot_002"],
    "status": "SHORTLISTED",
    "submittedAt": "2026-10-18T09:15:00+07:00",
    "interview": {
      "id": "interview_001",
      "status": "CONFIRMED",
      "startTime": "2026-11-05T09:00:00+07:00",
      "endTime": "2026-11-05T09:20:00+07:00",
      "room": {
        "id": "room_a",
        "name": "Phòng A"
      }
    }
  }
}
```

### Example — Executive view with the internal note

```http
GET /api/applications/application_001
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "application_001",
    "applicationCode": "A01",
    "campaignId": "campaign_001",
    "campaignName": "Tuyển thành viên CLB Công nghệ thông tin 2026",
    "positionId": "position_001",
    "positionName": "Content Creator",
    "studentId": "24120101",
    "fullName": "Nguyễn Minh Anh",
    "email": "studenta@clubflow.test",
    "phone": "0901234567",
    "cvUrl": "/api/applications/application_001/cv",
    "cvFileName": "A01-NguyenMinhAnh-CV.pdf",
    "cvSizeBytes": 1468006,
    "motivationStatement": "Em đã có kinh nghiệm quản lý fanpage học thuật và mong muốn tham gia Ban Nội dung.",
    "availabilitySlotIds": ["slot_001", "slot_002"],
    "status": "SHORTLISTED",
    "submittedAt": "2026-10-18T09:15:00+07:00",
    "internalNotes": "Portfolio tốt, phù hợp định hướng nội dung.",
    "interview": {
      "id": "interview_001",
      "status": "CONFIRMED",
      "startTime": "2026-11-05T09:00:00+07:00",
      "endTime": "2026-11-05T09:20:00+07:00",
      "room": {
        "id": "room_a",
        "name": "Phòng A"
      }
    }
  }
}
```

### Example — another Applicant's application

```http
GET /api/applications/application_003
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "success": false,
  "message": "You cannot access this application",
  "error": {
    "code": "FORBIDDEN"
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The application belongs to another Applicant, or the Interviewer is not assigned to it. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that ID. |

## 5. List applications for review

**Endpoint:** `GET /api/applications`  
**Access:** Executive only

| Query | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | No | Filter by campaign. |
| `positionId` | string | No | Filter by position. |
| `status` | string | No | `PENDING`, `SHORTLISTED` or `REJECTED`. |
| `search` | string | No | Match name, e-mail or student ID. |
| `sortBy` | string | No | `submittedAt`, `fullName` or `status`. |
| `order` | string | No | `asc` or `desc`; default `desc`. |
| `page` | integer | No | 1 or more; default 1. |
| `limit` | integer | No | 1–100; default 10. |

Each returned application includes `applicationCode` so the Executive interface can display a human-readable application identifier.

### Example

```http
GET /api/applications?campaignId=campaign_001&status=SHORTLISTED&sortBy=submittedAt&order=asc&page=1&limit=10
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "id": "application_001",
      "applicationCode": "A01",
      "applicantId": "u-studentA",
      "studentId": "24120101",
      "fullName": "Nguyễn Minh Anh",
      "email": "studenta@clubflow.test",
      "positionId": "position_001",
      "positionName": "Content Creator",
      "status": "SHORTLISTED",
      "submittedAt": "2026-10-18T09:15:00+07:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 6,
    "totalPages": 1
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | An invalid filter or pagination value. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |

## 6. Update screening status

**Endpoint:** `PATCH /api/applications/{applicationId}/screening`  
**Access:** Executive only  
**Content-Type:** `application/json`

| Field | Type | Required | Rules |
|---|---|---:|---|
| `status` | string | Yes | `SHORTLISTED` or `REJECTED`. |
| `internalNotes` | string | No | 0–2000 characters; Executive-only. |

### Example

```http
PATCH /api/applications/application_006/screening
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "status": "SHORTLISTED",
  "internalNotes": "Kinh nghiệm viết bài tốt; chuyển sang phỏng vấn."
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Application screening updated successfully",
  "data": {
    "id": "application_006",
    "applicationCode": "A06",
    "status": "SHORTLISTED",
    "internalNotes": "Kinh nghiệm viết bài tốt; chuyển sang phỏng vấn.",
    "reviewedAt": "2026-10-20T14:30:00+07:00"
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `status` is not `SHORTLISTED` or `REJECTED`, or a field is invalid. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that ID. |
| `409` | `APPLICATION_LOCKED` | The campaign is confirmed and applications are read-only. |

## 7. Application statistics

**Endpoint:** `GET /api/applications/statistics`  
**Access:** Executive only

| Query | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | Yes | The campaign to count. |

### Example

```http
GET /api/applications/statistics?campaignId=campaign_001
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "campaignId": "campaign_001",
    "totalApplications": 9,
    "pending": 2,
    "shortlisted": 6,
    "rejected": 1
  }
}
```

The statistics count all applications matching the campaign, regardless of pagination. For the shared `campaign_001` example data, the expected totals are 9 applications: 2 `PENDING`, 6 `SHORTLISTED` and 1 `REJECTED`.

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `campaignId` is missing. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |

## 8. Export applications

**Endpoint:** `GET /api/applications/export`  
**Access:** Executive only

| Query | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | Yes | The campaign to export. |
| `status` | string | No | Optional status filter. |

The answer is a CSV attachment. Internal notes are not included.

The CSV must include an `applicationCode` column so exported records can be matched with the identifiers shown in the application review interface.

### Example

```http
GET /api/applications/export?campaignId=campaign_001
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="applications.csv"
```

Example CSV content:

```csv
applicationCode,studentId,fullName,email,positionName,status,submittedAt
A01,24120101,Nguyễn Minh Anh,studenta@clubflow.test,Content Creator,SHORTLISTED,2026-10-18T09:15:00+07:00
A02,24120102,Trần Minh Bình,studentb@clubflow.test,Technical Member,PENDING,2026-10-18T09:30:00+07:00
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `campaignId` is missing or the status filter is invalid. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |

## 9. Download a CV

**Endpoint:** `GET /api/applications/{applicationId}/cv`  
**Access:** Applicant own · Executive · Interviewer assigned

### Example

```http
GET /api/applications/application_001/cv
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="A01-NguyenMinhAnh-CV.pdf"
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller may not read this application. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that ID. |
| `404` | `CV_NOT_FOUND` | The application has no uploaded CV. |

## 10. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added executable examples, field limits, the Applicant/Executive field split, and the `cvSizeBytes` / `cvFileName` fields. | Make every screening and tracking endpoint testable and keep internal notes out of Applicant answers. |
| 2026-11-25 | Added interview slot selection validation for `availabilitySlotIds`, including minimum selection, campaign ownership, duplicate ID rejection, and invalid slot examples. | Prevent invalid interview availability references. |
| 2026-11-25 | Added `applicationCode` to application resource responses and the CSV export format. | Ensure the Frontend can display consistent human-readable application identifiers. |
| 2026-11-25 | Added the nullable `interview` field to Applicant tracking and application detail responses. | Allow Applicants to view their confirmed interview date, time and room. |
| 2026-11-25 | Clarified duplicate application handling and the Frontend behavior for `409 APPLICATION_ALREADY_EXISTS`. | Ensure duplicate submissions open the existing application instead of creating another record. |
| 2026-11-25 | Aligned the shortlisted application list example with the campaign statistics example. | Keep shared sample data and automated contract checks consistent. |
| 2026-11-25 | Documented the required Express route declaration order. | Prevent static application routes from being captured by dynamic `:applicationId` routes. |
| 2026-11-25 | Changed the confirmed interview `room` from a string to `{"id", "name"}` and aligned it with the `Phòng A` seed data. | Keep the room shape and Vietnamese room names identical across the Applications, Schedules and Interviewers APIs. |
